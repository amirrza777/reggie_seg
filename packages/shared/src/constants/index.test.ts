import { APP_NAME } from "./index";

describe("constants", () => {
  it("exposes app name", () => {
    expect(APP_NAME).toBe("Team Feedback");
  });
});
