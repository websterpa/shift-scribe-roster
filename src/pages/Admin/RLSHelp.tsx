import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, CheckCircle, Shield, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SQL_SCRIPT = `-- =============================================================================
-- Site-Based Row Level Security (RLS) Setup
-- =============================================================================
-- This script enables RLS on key tables and creates policies based on site_id
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- =============================================================================

-- Step 1: Ensure profiles table has site_id column
-- (Skip if already exists)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS site_id TEXT;

-- Step 2: Create security definer function to get user's site_id
-- This prevents recursive RLS issues
CREATE OR REPLACE FUNCTION public.get_user_site_id(_user_id uuid)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT site_id 
  FROM public.profiles 
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- Step 3: Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_site_admin(_user_id uuid)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_admin, false)
  FROM public.profiles 
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- =============================================================================
-- ROSTER_ASSIGNMENTS Table
-- =============================================================================

-- Enable RLS
ALTER TABLE public.roster_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view assignments in their site" ON public.roster_assignments;
DROP POLICY IF EXISTS "Admins can insert assignments" ON public.roster_assignments;
DROP POLICY IF EXISTS "Admins can update assignments" ON public.roster_assignments;
DROP POLICY IF EXISTS "Admins can delete assignments" ON public.roster_assignments;

-- SELECT: Users see only their site's assignments
CREATE POLICY "Users can view assignments in their site"
ON public.roster_assignments
FOR SELECT
TO authenticated
USING (
  -- Get version's config_id, then check site_id
  EXISTS (
    SELECT 1 FROM public.roster_versions rv
    JOIN public.roster_config rc ON rc.id = rv.config_id
    WHERE rv.id = roster_assignments.version_id
      AND (
        public.get_user_site_id(auth.uid()) IS NULL -- No site restriction
        OR rc.site_id = public.get_user_site_id(auth.uid())
      )
  )
);

-- INSERT: Only admins can create assignments
CREATE POLICY "Admins can insert assignments"
ON public.roster_assignments
FOR INSERT
TO authenticated
WITH CHECK (public.is_site_admin(auth.uid()));

-- UPDATE: Only admins can update assignments
CREATE POLICY "Admins can update assignments"
ON public.roster_assignments
FOR UPDATE
TO authenticated
USING (public.is_site_admin(auth.uid()));

-- DELETE: Only admins can delete assignments
CREATE POLICY "Admins can delete assignments"
ON public.roster_assignments
FOR DELETE
TO authenticated
USING (public.is_site_admin(auth.uid()));

-- =============================================================================
-- ROSTER_CONFIG Table
-- =============================================================================

-- Add site_id column if not exists
ALTER TABLE public.roster_config 
ADD COLUMN IF NOT EXISTS site_id TEXT;

-- Enable RLS
ALTER TABLE public.roster_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view configs in their site" ON public.roster_config;
DROP POLICY IF EXISTS "Admins can insert configs" ON public.roster_config;
DROP POLICY IF EXISTS "Admins can update configs" ON public.roster_config;
DROP POLICY IF EXISTS "Admins can delete configs" ON public.roster_config;

-- SELECT: Users see only their site's configs
CREATE POLICY "Users can view configs in their site"
ON public.roster_config
FOR SELECT
TO authenticated
USING (
  public.get_user_site_id(auth.uid()) IS NULL -- No site restriction
  OR site_id = public.get_user_site_id(auth.uid())
);

-- INSERT: Only admins can create configs
CREATE POLICY "Admins can insert configs"
ON public.roster_config
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_site_admin(auth.uid())
  AND (site_id = public.get_user_site_id(auth.uid()) OR public.get_user_site_id(auth.uid()) IS NULL)
);

-- UPDATE: Only admins can update their site's configs
CREATE POLICY "Admins can update configs"
ON public.roster_config
FOR UPDATE
TO authenticated
USING (
  public.is_site_admin(auth.uid())
  AND (site_id = public.get_user_site_id(auth.uid()) OR public.get_user_site_id(auth.uid()) IS NULL)
);

-- DELETE: Only admins can delete their site's configs
CREATE POLICY "Admins can delete configs"
ON public.roster_config
FOR DELETE
TO authenticated
USING (
  public.is_site_admin(auth.uid())
  AND (site_id = public.get_user_site_id(auth.uid()) OR public.get_user_site_id(auth.uid()) IS NULL)
);

-- =============================================================================
-- STAFF_PROFILES Table
-- =============================================================================

-- Add site_id column if not exists
ALTER TABLE public.staff_profiles 
ADD COLUMN IF NOT EXISTS site_id TEXT;

-- Enable RLS
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view staff in their site" ON public.staff_profiles;
DROP POLICY IF EXISTS "Admins can insert staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "Admins can update staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "Admins can delete staff" ON public.staff_profiles;

-- SELECT: Users see only their site's staff
CREATE POLICY "Users can view staff in their site"
ON public.staff_profiles
FOR SELECT
TO authenticated
USING (
  public.get_user_site_id(auth.uid()) IS NULL -- No site restriction
  OR site_id = public.get_user_site_id(auth.uid())
);

-- INSERT: Only admins can create staff
CREATE POLICY "Admins can insert staff"
ON public.staff_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_site_admin(auth.uid())
  AND (site_id = public.get_user_site_id(auth.uid()) OR public.get_user_site_id(auth.uid()) IS NULL)
);

-- UPDATE: Only admins can update their site's staff
CREATE POLICY "Admins can update staff"
ON public.staff_profiles
FOR UPDATE
TO authenticated
USING (
  public.is_site_admin(auth.uid())
  AND (site_id = public.get_user_site_id(auth.uid()) OR public.get_user_site_id(auth.uid()) IS NULL)
);

-- DELETE: Only admins can delete their site's staff
CREATE POLICY "Admins can delete staff"
ON public.staff_profiles
FOR DELETE
TO authenticated
USING (
  public.is_site_admin(auth.uid())
  AND (site_id = public.get_user_site_id(auth.uid()) OR public.get_user_site_id(auth.uid()) IS NULL)
);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- Run these to verify the setup is working:

-- Check your site_id
SELECT get_user_site_id(auth.uid());

-- Check if you're an admin
SELECT is_site_admin(auth.uid());

-- Test roster_assignments access
SELECT COUNT(*) FROM roster_assignments;

-- Test roster_config access
SELECT COUNT(*) FROM roster_config;

-- Test staff_profiles access
SELECT COUNT(*) FROM staff_profiles;

-- =============================================================================
-- DONE!
-- =============================================================================`;

export default function RLSHelp() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SQL_SCRIPT);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "SQL script copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please manually select and copy the SQL",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-8 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You must be logged in to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Site-Based Row Level Security Setup</h1>
        </div>
        <p className="text-muted-foreground">
          Enable site-based data isolation for multi-tenant roster management
        </p>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Admin Only:</strong> This SQL script will restrict data access based on site membership. 
          Only run this if you understand Row Level Security and have tested it in a development environment first.
        </AlertDescription>
      </Alert>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>What This Does</CardTitle>
          <CardDescription>
            This script enables Row Level Security (RLS) on key tables and ensures users only see data for their assigned site
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Tables Protected
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• roster_assignments</li>
                <li>• roster_config</li>
                <li>• staff_profiles</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Access Rules
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• Users see only their site's data</li>
                <li>• Admins can create/edit/delete</li>
                <li>• Uses security definer functions</li>
                <li>• Prevents recursive RLS issues</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>How to Apply</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground font-semibold text-xs">
                1
              </span>
              <span>
                Click the <strong>"Copy SQL Script"</strong> button below
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground font-semibold text-xs">
                2
              </span>
              <span>
                Open your Supabase project dashboard → <strong>SQL Editor</strong>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground font-semibold text-xs">
                3
              </span>
              <span>
                Paste the SQL and click <strong>"Run"</strong>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground font-semibold text-xs">
                4
              </span>
              <span>
                Verify setup by running the verification queries at the end of the script
              </span>
            </li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>SQL Script</CardTitle>
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy SQL Script
                </>
              )}
            </Button>
          </div>
          <CardDescription>
            Copy and paste this into Supabase SQL Editor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono border max-h-[600px] overflow-y-auto">
              {SQL_SCRIPT}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Alert className="mt-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> After running this script, make sure to update the <code>site_id</code> column 
          in your profiles table for all users. Users without a site_id will have unrestricted access (useful for super admins).
        </AlertDescription>
      </Alert>
    </div>
  );
}
