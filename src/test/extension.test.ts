import * as assert from "assert";
import { buildDynamicFlags } from "../commands/manifestVariables";
import { execFile } from "../utilities/utilities";
import { leafPreFormat, leafPostFormat } from "../leafFormat";

suite("Vapor Extension Test Suite", () => {
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

	test("Leaf Formatter", () => {
		const html = "<h1>Hello, World!</h1><p>This is a test.</p>\n" +
			"#if(bool):<p>True</p>#endif\n" +
			"#if(bool):<p>True</p>#else:<p>False</p>#endif\n" +
			"\n" +
			"#if(bool):<p>Test</p>#elseif(otherBool):<p>OtherTest</p>#else:#if(secondBool):<p>SecondTrue</p>#endif#endif\n" +
			"<script>\n" +
			"#if(true): console.log(helloWorld) #endif\n" +
			"</script>\n" +
			"<style>\n" +
			"body {\n" +
			"    background-color: red;\n" +
			"}\n" +
			"</style>";
	
		const preFormatted = leafPreFormat(html);
		const expectedPreFormatted = "<h1>Hello, World!</h1><p>This is a test.</p>\n" +
			"#if(bool):\n" +
			"<p>True</p>\n" +
			"#endif\n" +
			"#if(bool):\n" +
			"<p>True</p>\n" +
			"#else:\n" +
			"<p>False</p>\n" +
			"#endif\n" +
			"\n" +
			"#if(bool):\n" +
			"<p>Test</p>\n" +
			"#elseif(otherBool):\n" +
			"<p>OtherTest</p>\n" +
			"#else:\n" +
			"#if(secondBool):\n" +
			"<p>SecondTrue</p>\n" +
			"#endif\n" +
			"#endif\n" +
			"<script>\n" +
			"#if(true): console.log(helloWorld) #endif\n" +
			"</script>\n" +
			"<style>\n" +
			"body {\n" +
			"    background-color: red;\n" +
			"}\n" +
			"</style>";
	
		assert.strictEqual(preFormatted, expectedPreFormatted);
	
		const postFormatted = leafPostFormat(preFormatted, "    ", 80);
		const expectedPostFormatted = [
			"<h1>Hello, World!</h1><p>This is a test.</p>",
			"#if(bool):",
			"    <p>True</p>",
			"#endif",
			"#if(bool):",
			"    <p>True</p>",
			"#else:",
			"    <p>False</p>",
			"#endif",
			"",
			"#if(bool):",
			"    <p>Test</p>",
			"#elseif(otherBool):",
			"    <p>OtherTest</p>",
			"#else:",
			"    #if(secondBool):",
			"        <p>SecondTrue</p>",
			"    #endif",
			"#endif",
			"<script>",
			"#if(true): console.log(helloWorld) #endif",
			"</script>",
			"<style>",
			"body {",
			"    background-color: red;",
			"}",
			"</style>",
		].join("\n");
	
		assert.strictEqual(postFormatted, expectedPostFormatted);
	});
});
