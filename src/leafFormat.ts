import * as vscode from "vscode";
import format from "html-format";

export class LeafFormatter implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
    provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions
    ): vscode.TextEdit[] {
        const { tabSize, insertSpaces } = options;
        const indent = insertSpaces ? " ".repeat(tabSize) : "\t";

        const { languageId: lang, uri } = document;
        const langConfig = vscode.workspace.getConfiguration(`[${lang}]`, uri);
        const config = vscode.workspace.getConfiguration("editor", uri);
        const width = langConfig["editor.wordWrapColumn"] || config.get("wordWrapColumn", 140);

        const text = document.getText();
        const range = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
        );

        const { processedHtml, scripts } = preserveScriptTags(text);

        const preFormatted = leafPreFormat(processedHtml);
        const htmlFormatted = format(preFormatted, indent, width);
        const postFormatted = leafPostFormat(htmlFormatted, indent, width);

        const formatted = restoreScriptTags(postFormatted, scripts);

        return [new vscode.TextEdit(range, formatted)];
    }

    provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range,
        options: vscode.FormattingOptions
    ): vscode.TextEdit[] {
        const { tabSize, insertSpaces } = options;
        const indent = insertSpaces ? " ".repeat(tabSize) : "\t";

        const { languageId: lang, uri } = document;
        const langConfig = vscode.workspace.getConfiguration(`[${lang}]`, uri);
        const config = vscode.workspace.getConfiguration("editor", uri);
        const width = langConfig["editor.wordWrapColumn"] || config.get("wordWrapColumn", 140);

        const text = document.getText(range);

        const { processedHtml, scripts } = preserveScriptTags(text);

        const preFormatted = leafPreFormat(processedHtml);
        const htmlFormatted = format(preFormatted, indent, width);
        const postFormatted = leafPostFormat(htmlFormatted, indent, width);

        const formatted = restoreScriptTags(postFormatted, scripts);

        return [new vscode.TextEdit(range, formatted)];
    }

    provideDocumentRangesFormattingEdits(
        document: vscode.TextDocument,
        ranges: vscode.Range[],
        options: vscode.FormattingOptions
    ): vscode.TextEdit[] {
        const { tabSize, insertSpaces } = options;
        const indent = insertSpaces ? " ".repeat(tabSize) : "\t";

        const { languageId: lang, uri } = document;
        const langConfig = vscode.workspace.getConfiguration(`[${lang}]`, uri);
        const config = vscode.workspace.getConfiguration("editor", uri);
        const width = langConfig["editor.wordWrapColumn"] || config.get("wordWrapColumn", 140);

        const edits: vscode.TextEdit[] = [];
        for (const range of ranges) {
            const text = document.getText(range);

            const { processedHtml, scripts } = preserveScriptTags(text);

            const preFormatted = leafPreFormat(processedHtml);
            const htmlFormatted = format(preFormatted, indent, width);
            const postFormatted = leafPostFormat(htmlFormatted, indent, width);

            const formatted = restoreScriptTags(postFormatted, scripts);
            
            edits.push(new vscode.TextEdit(range, formatted));
        }
        return edits;
    }
}

/**
 * Puts Leaf tags that have a body on their own line
 *
 * @param html the HTML to format
 *
 * @returns the formatted HTML
 */
export function leafPreFormat(html: string): string {
    const lines = html.split("\n");
    const result: string[] = [];
    const regex = /(.*?)(#[A-Za-z]\w*(?:\([^#]*\))?:|#end\w+)(.*)/;

    for (const line of lines) {
        if (line.trim() === "") {
            result.push(line);
            continue;
        }

        let remaining = line;
        while (true) {
            const match = remaining.match(regex);
            if (match) {
                const prefix = match[1];
                const tag = match[2];
                const rest = match[3];

                if (prefix.trim().length > 0) {
                    result.push(prefix);
                }

                result.push(tag);

                remaining = rest;
            } else {
                if (remaining.trim().length > 0) {
                    result.push(remaining);
                }
                break;
            }
        }
    }

    return result.join("\n");
}

/**
 * Fixes the indentation of Leaf tags
 *
 * @param html the HTML to format
 * @param indent the string to use for indentation
 * @param width the max width of the document
 *
 * @returns the formatted HTML
 */
export function leafPostFormat(html: string, indent: string, width: number): string {
    const lines = html.split("\n");
    const result: string[] = [];
    let indentLevel = 0;

    for (const line of lines) {
        const match = line.match(/^\s*/);
        const initialIndent = match ? match[0] : "";

        const trimmedLine = line.trim();

        if (trimmedLine === "") {
            result.push(line);
            continue;
        }

        if (trimmedLine.startsWith("#else") || trimmedLine.startsWith("#elseif") || trimmedLine.startsWith("#end")) {
            indentLevel--;
        }

        const leafIndent = indent.repeat(Math.max(0, indentLevel));
        result.push(initialIndent + leafIndent + trimmedLine);

        if (trimmedLine.startsWith("#") && trimmedLine.endsWith(":")) {
            indentLevel++;
        }
    }

    return result.join("\n");
}

/**
 * Preserves script tags in the HTML by replacing them with placeholders
 *
 * @param html the HTML to process
 *
 * @returns an object containing the processed HTML and a map of script placeholders to their original content
 */
function preserveScriptTags(html: string): { processedHtml: string, scripts: Map<string, string> } {
    const scripts = new Map<string, string>();
    let scriptId = 0;
    
    // Replace script tags and their content with placeholders
    const processedHtml = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (match, scriptContent) => {
        const placeholder = `<!--SCRIPT_PLACEHOLDER_${scriptId}-->`;
        scripts.set(placeholder, match);
        scriptId++;
        return placeholder;
    });
    
    return { processedHtml, scripts };
}

/**
 * Restores script tags in the HTML by replacing placeholders with their original content
 * 
 * @param html the HTML to process
 * @param scripts a map of script placeholders to their original content
 *
 * @returns the processed HTML with script tags restored
 */
function restoreScriptTags(html: string, scripts: Map<string, string>): string {
    let result = html;
    scripts.forEach((scriptContent, placeholder) => {
        result = result.replace(placeholder, scriptContent);
    });
    return result;
}
