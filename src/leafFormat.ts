import * as vscode from "vscode";
import beautify from "js-beautify";

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

        const formatterOptions = {
            indent_with_tabs: !insertSpaces,
            indent_size: tabSize,
            wrap_line_length: width,
        };

        const preFormatted = leafPreFormat(text);
        const htmlFormatted = beautify.html(preFormatted, formatterOptions);
        const postFormatted = leafPostFormat(htmlFormatted, indent, width);

        return [new vscode.TextEdit(range, postFormatted)];
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

        const formatterOptions = {
            indent_with_tabs: !insertSpaces,
            indent_size: tabSize,
            wrap_line_length: width,
        };

        const preFormatted = leafPreFormat(text);
        const htmlFormatted = beautify.html(preFormatted, formatterOptions);
        const postFormatted = leafPostFormat(htmlFormatted, indent, width);

        return [new vscode.TextEdit(range, postFormatted)];
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

        const formatterOptions = {
            indent_with_tabs: !insertSpaces,
            indent_size: tabSize,
            wrap_line_length: width,
        };

        const edits: vscode.TextEdit[] = [];
        for (const range of ranges) {
            const text = document.getText(range);

            const preFormatted = leafPreFormat(text);
            const htmlFormatted = beautify.html(preFormatted, formatterOptions);
            const postFormatted = leafPostFormat(htmlFormatted, indent, width);
            
            edits.push(new vscode.TextEdit(range, postFormatted));
        }
        return edits;
    }
}

/**
 * Puts Leaf tags that have a body on their own line.
 *
 * @param html The HTML to format.
 *
 * @returns The formatted HTML.
 */
export function leafPreFormat(html: string): string {
    const lines = html.split("\n");
    const result: string[] = [];
    const regex = /(.*?)(#[A-Za-z]\w*(?:\([^#]*\))?:|#end\w+)(.*)/;

    for (const line of lines) {
        if (line.trim() === "") {
            result.push(""); // If the line is empty, just add an empty line
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
 * Fixes the indentation of Leaf tags.
 *
 * @param html The HTML to format.
 * @param indent The string to use for indentation.
 * @param width The max width of the document.
 *
 * @returns The formatted HTML.
 */
export function leafPostFormat(html: string, indent: string, width: number): string {
    const lines = html.split("\n");
    const result: string[] = [];
    let leafIndentLevel = 0; // Indicates the number of Leaf tags that are open

    for (const line of lines) {
        const existingIndentMatch = line.match(/^(\s*)(.*)/);
        const existingIndent = existingIndentMatch ? existingIndentMatch[1] : "";
        const content = existingIndentMatch ? existingIndentMatch[2] : line;

        // If in this line there is a closing tag, reduce the indentation level
        if (content.startsWith("#end") || content.startsWith("#else") || content.startsWith("#elseif")) {
            leafIndentLevel = Math.max(0, leafIndentLevel - 1);
        }

        // Add the line with the appropriate indentation
        if (content.length === 0) {
            result.push(""); // If the line is empty, just add an empty line
        } else {
            // Calculate the indentation for the current line
            const newIndent = indent.repeat(leafIndentLevel);

            result.push(existingIndent + newIndent + content);
        }

        // If in this line there is an opening tag, increase the indentation level
        if (content.startsWith("#") && content.endsWith(":")) {
            leafIndentLevel++;
        }
    }

    return result.join("\n");
}
