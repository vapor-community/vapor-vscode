# Vapor for Visual Studio Code

This extension adds support for the Vapor web framework to Visual Studio Code, providing a seamless experience for developing Vapor applications on all supported platforms.

You can also use this extension when running VS Code in the browser to have Leaf syntax highlighting.

## Features

*   💧 Create new Vapor projects

    <img src="https://raw.githubusercontent.com/vapor-community/vapor-vscode/main/images/createNewProject.png" width="260" height="200">

*   🍃 Language support and formatter for the Leaf templating language

    <img src="https://raw.githubusercontent.com/vapor-community/vapor-vscode/main/images/leafHighlighting.png" width="630" height="430">

    <img src="https://raw.githubusercontent.com/vapor-community/vapor-vscode/main/images/leafFormatting.gif" width="630" height="430">

*   ✏️ Code snippets for common Vapor and Leaf code patterns

## Requirements

This extension requires the Vapor Toolbox to be installed on your system for project creation.

> **Note**
> If you only need Leaf language support, you don't need to install the Toolbox.

On macOS and Linux, the Toolbox is distributed via Homebrew. If you do not have Homebrew yet, visit [brew.sh](https://brew.sh/) for install instructions.

```sh
brew install vapor
```

For more information and installation methods, see the [Toolbox page](https://github.com/vapor/toolbox).

## Known Issues

Formatting Leaf tags embedded in HTML attributes has some limitations.
