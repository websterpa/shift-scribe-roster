import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import RequirementsMiniComposer from "@/features/roster/builder/RequirementsMiniComposer";

describe("RequirementsMiniComposer @composer", () => {
  test("switches between 8h and 12h frameworks", () => {
    const onFrameworkChange = vi.fn();
    const onChange = vi.fn();
    
    render(
      <RequirementsMiniComposer
        framework="8h"
        onFrameworkChange={onFrameworkChange}
        onChange={onChange}
      />
    );

    // Should show E/L/N for 8h
    expect(screen.getByText("Early")).toBeInTheDocument();
    expect(screen.getByText("Late")).toBeInTheDocument();
    expect(screen.getByText("Night")).toBeInTheDocument();

    // Switch to 12h
    fireEvent.click(screen.getByRole("button", { name: /12-hour/i }));
    expect(onFrameworkChange).toHaveBeenCalledWith("12h");
  });

  test("shows D/N for 12h framework and hides E/L", () => {
    const onChange = vi.fn();
    
    render(
      <RequirementsMiniComposer
        framework="12h"
        onFrameworkChange={vi.fn()}
        onChange={onChange}
      />
    );

    // Should show D/N for 12h
    expect(screen.getByText("Day")).toBeInTheDocument();
    expect(screen.getByText("Night")).toBeInTheDocument();
    
    // Should NOT show E/L
    expect(screen.queryByText("Early")).not.toBeInTheDocument();
    expect(screen.queryByText("Late")).not.toBeInTheDocument();
  });

  test("applies 'Weekday/Weekend split' preset", () => {
    const onChange = vi.fn();
    
    render(
      <RequirementsMiniComposer
        framework="8h"
        onFrameworkChange={vi.fn()}
        onChange={onChange}
      />
    );

    // Click preset button
    fireEvent.click(screen.getByRole("button", { name: /Weekday\/Weekend split/i }));

    // Check that weekday values are set to 2
    const weekdayEInput = screen.getByTestId("composer-weekdays-E") as HTMLInputElement;
    expect(weekdayEInput.value).toBe("2");

    // Check that saturday/sunday values are set to 1
    const saturdayEInput = screen.getByTestId("composer-saturday-E") as HTMLInputElement;
    expect(saturdayEInput.value).toBe("1");
  });

  test("updates values when user changes Saturday E to 3", () => {
    const onChange = vi.fn();
    
    render(
      <RequirementsMiniComposer
        framework="8h"
        onFrameworkChange={vi.fn()}
        onChange={onChange}
      />
    );

    const saturdayEInput = screen.getByTestId("composer-saturday-E");
    fireEvent.change(saturdayEInput, { target: { value: "3" } });

    // Verify the input value changed
    expect((saturdayEInput as HTMLInputElement).value).toBe("3");

    // Verify onChange was called with updated requirements
    // The last call should have Saturday (dow=6) with E=3
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall[6]?.E).toBe(3);
  });

  test("returned requirementsByDay covers all days 0-6", () => {
    const onChange = vi.fn();
    
    render(
      <RequirementsMiniComposer
        framework="8h"
        onFrameworkChange={vi.fn()}
        onChange={onChange}
      />
    );

    // Should be called on mount with initial values
    expect(onChange).toHaveBeenCalled();
    
    const requirements = onChange.mock.calls[0][0];
    
    // Should have entries for all 7 days (0=Sun through 6=Sat)
    expect(Object.keys(requirements).length).toBe(7);
    expect(requirements[0]).toBeDefined(); // Sunday
    expect(requirements[1]).toBeDefined(); // Monday
    expect(requirements[6]).toBeDefined(); // Saturday
  });

  test("applies 'Nights only' preset correctly", () => {
    const onChange = vi.fn();
    
    render(
      <RequirementsMiniComposer
        framework="8h"
        onFrameworkChange={vi.fn()}
        onChange={onChange}
      />
    );

    // Click nights only preset
    fireEvent.click(screen.getByRole("button", { name: /Nights only/i }));

    // E and L should be 0
    const weekdayEInput = screen.getByTestId("composer-weekdays-E") as HTMLInputElement;
    const weekdayLInput = screen.getByTestId("composer-weekdays-L") as HTMLInputElement;
    const weekdayNInput = screen.getByTestId("composer-weekdays-N") as HTMLInputElement;
    
    expect(weekdayEInput.value).toBe("0");
    expect(weekdayLInput.value).toBe("0");
    expect(weekdayNInput.value).toBe("2"); // N should be 2
  });

  test("resets values to defaults when Reset is clicked", () => {
    const onChange = vi.fn();
    
    render(
      <RequirementsMiniComposer
        framework="8h"
        onFrameworkChange={vi.fn()}
        onChange={onChange}
      />
    );

    // Change a value
    const saturdayEInput = screen.getByTestId("composer-saturday-E");
    fireEvent.change(saturdayEInput, { target: { value: "5" } });
    expect((saturdayEInput as HTMLInputElement).value).toBe("5");

    // Click reset
    fireEvent.click(screen.getByRole("button", { name: /Reset/i }));

    // Should be back to default (1 for Saturday)
    expect((saturdayEInput as HTMLInputElement).value).toBe("1");
  });
});
