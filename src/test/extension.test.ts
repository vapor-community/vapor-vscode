import * as assert from "assert";
import * as vscode from "vscode";
import { buildDynamicFlags } from "../commands/manifestVariables";

suite("Vapor Extension Test Suite", () => {
	vscode.window.showInformationMessage("Start all tests.");

	test("buildDynamicFlags", () => {
		const responses = '{"fluent":{"db":"Postgres (Recommended)","model":{"name":"TestModel","migrate":true,"extras":{"authentication":true}}},"leaf":true,"jwt":true,"deploy":"Heroku","hello":"Ciao, mamma!"}';
		const expectedFlags = [
			"--fluent.db", "Postgres (Recommended)",
			"--fluent.model.name", "TestModel",
			"--fluent.model.migrate",
			"--fluent.model.extras.authentication",
			"--leaf",
			"--jwt",
			"--deploy", "Heroku",
			"--hello", "Ciao, mamma!"
		];

		assert.deepStrictEqual(buildDynamicFlags(JSON.parse(responses)), expectedFlags);
	});
});
