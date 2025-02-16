import * as assert from "assert";
import * as vscode from "vscode";
import { buildDynamicFlags } from "../commands/manifestVariables";
import { execFile } from "../utilities/utilities";

suite("Vapor Extension Test Suite", () => {
	vscode.window.showInformationMessage("Start all tests.");

	test("buildDynamicFlags", () => {
		const responses = '{"fluent":{"db":"Postgres (Recommended)","model":{"name":"TestModel","migrate":true,"extras":{"authentication":true}}},"leaf":true,"jwt":false,"deploy":"Heroku","hello":"Ciao, mamma!"}';
		const expectedFlags = [
			"--fluent.db", "Postgres (Recommended)",
			"--fluent.model.name", "TestModel",
			"--fluent.model.migrate",
			"--fluent.model.extras.authentication",
			"--leaf",
			"--no-jwt",
			"--deploy", "Heroku",
			"--hello", "Ciao, mamma!"
		];

		assert.deepStrictEqual(buildDynamicFlags(JSON.parse(responses)), expectedFlags);
	});

	test("execFile", async () => {
		const result = await execFile("echo", ["Hello, World!"]);
		assert.strictEqual(result.stdout, "Hello, World!\n");

		try {
			await execFile("ls", ["-l", "/nonexistent"]);
			assert.fail("Expected execFile to throw an error for an invalid command.");
		} catch (error) {}
	});
});
