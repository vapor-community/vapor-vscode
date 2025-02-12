import * as vscode from "vscode";
import * as fs from "fs/promises";
import { execVapor } from "../utilities/utilities";
import { promptForVariables, buildDynamicFlags } from "./manifestVariables";

export async function createNewProject() {
	// Check if the Vapor Toolbox is installed
	/*
	try {
		await execVapor(["--version"]);
	} catch (error) {
		vscode.window.showErrorMessage("Vapor Toolbox is not installed. Please install it before creating a new project.");
		return;
	}
	*/

    // Prompt the user for a location in which to create the new project
	const selectedFolder = await vscode.window.showOpenDialog({
		title: "Select a folder to create a new Vapor project in",
		openLabel: "Select folder",
		canSelectFolders: true,
		canSelectFiles: false,
		canSelectMany: false
	});
	if (!selectedFolder || selectedFolder.length === 0) {
		return undefined;
	}

	// Prompt the user for the project name
	const existingNames = await fs.readdir(selectedFolder[0].fsPath, { encoding: "utf-8" });
	const projectName = await vscode.window.showInputBox({
		prompt: "Enter a name for your new Vapor project",
		validateInput(value) {
			if (value.trim() === "") {
				return "Project name cannot be empty.";
			} else if (value.includes("/") || value.includes("\\")) {
				return "Project name cannot contain '/' or '\\' characters.";
			} else if (value === "." || value === "..") {
				return "Project name cannot be '.' or '..'.";
			}
			// Ensure there are no name collisions
			if (existingNames.includes(value)) {
				return "A file/folder with this name already exists.";
			}
			return undefined;
		},
	});
	if (projectName === undefined) {
		return undefined;
	}

	// Get the configuration for the Vapor extension and build the flags for the Vapor Toolbox
	const config = vscode.workspace.getConfiguration("vapor-vscode");
	const buildFlags: string[] = [];

	const templateURL = config.get<string>("template.url");
	const templateBranch = config.get<string>("template.branch");
	const templateManifestPath = config.get<string>("template.manifest");
	const createGitRepo = config.get<boolean>("git.repo");
	const createGitCommit = config.get<boolean>("git.commit");

	if (templateURL) { buildFlags.push("--template", templateURL); }
	if (templateBranch) { buildFlags.push("--branch", templateBranch); }
	if (templateManifestPath) { buildFlags.push("--manifest", templateManifestPath); }
	if (!createGitRepo) { buildFlags.push("--no-git"); }
	if (!createGitCommit) { buildFlags.push("--no-commit"); }

	try {
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: `Creating Vapor project ${projectName}`,
			cancellable: false
		}, async (progress, token) => {
			progress.report({ increment: 0, message: "Collecting template variables..." });
			const variablesJSONOutput = await execVapor([projectName, "--json", ...buildFlags], { cwd: selectedFolder[0].fsPath });
			const variablesJSON = JSON.parse(variablesJSONOutput.stdout);

			progress.report({ increment: 30, message: "Prompting for variables..." });
			const userResponses = await promptForVariables(variablesJSON);
			const dynamicFlags = buildDynamicFlags(userResponses);

			// Use Vapor Toolbox to initialize the Vapor project
			const projectUri = vscode.Uri.joinPath(selectedFolder[0], projectName);
			const args = [
				projectName,
				"-n",
				"--output",
				projectUri.fsPath
			];
			args.push(...buildFlags);
			args.push(...dynamicFlags);

			progress.report({ increment: 50, message: "Initializing project..." });
			await execVapor(args, { cwd: selectedFolder[0].fsPath });

			progress.report({ increment: 20, message: "Opening project..." });
			vscode.commands.executeCommand("vscode.openFolder", projectUri);
		});
	} catch (error) {
		vscode.window.showErrorMessage(`Error creating project: ${error}`);
	}
}
