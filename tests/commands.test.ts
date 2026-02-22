import { describe, it, expect, beforeEach } from "vitest";
import cmd, { type Command } from "../src/commands/map.js";

describe("Command Registry (map.ts)", () => {
  beforeEach(() => {
    cmd.reset();
  });

  it("should successfully add a new command to the registry", () => {
    const dummyCmd: Command = {
      name: "ping",
      alias: ["p"],
      category: ["general"],
      desc: "Test ping command",
      run: async () => {},
    };

    cmd.add(dummyCmd);

    const result = cmd.find("ping");
    expect(result).toBeDefined();
    expect(result?.name).toBe("ping");
  });

  it("should find the command using its alias", () => {
    const dummyCmd: Command = {
      name: "hello",
      alias: ["hi", "hola"],
      category: ["general"],
      desc: "Greeting command",
      run: async () => {},
    };

    cmd.add(dummyCmd);

    const resultHi = cmd.find("hi");
    const resultHola = cmd.find("hola");

    expect(resultHi?.name).toBe("hello");
    expect(resultHola?.name).toBe("hello");
  });

  it("should return undefined for unregistered commands", () => {
    const result = cmd.find("unknown_command");
    expect(result).toBeUndefined();
  });
});
