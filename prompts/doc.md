Generate a comprehensive documentation file for the specified file, including a detailed description of its purpose, key features, technical specifications, usage instructions, and any relevant troubleshooting steps. Ensure the document is formatted for easy readability and includes clear headings and sections. Target the developers who will use the file. Be concise and do not include any unnecessary details.

Before generating documentation:

1. Review README.md for project overview
2. Review the actual source file (.js) for accuracy
3. Check existing wiki pages for consistent style and cross-references
4. Review AGENTS.md for project conventions

If you document a function, include the following information in the "Technical specifications" section:

- Signature (all overloads if applicable)
- Full description of parameters
- Return value
- Additional exports and their descriptions

If you document a class or object, include the following information in the "Technical specifications" section:

- Constructor parameters
- Properties with types and descriptions
- Methods with full description of parameters and return value

Usage instructions should include:

- Import statement following project conventions
- A simple but representative use case
- Show relevant methods and options in context

Troubleshooting should include common issues and their solutions.

Cross-reference related components:

- Link to related API pages (e.g., TestWorker references streams, tape6-proc references TestWorker)
- Link to tape-six documentation for shared concepts (configuration, reporters, flags)

Include a "See Also" section at the end with:

- Related API documentation links
- Related utility documentation links
- Links to related wiki pages

When you generate links in a file located in the wiki directory, use relative paths for wiki files and full path for files located in the main repository. For example `README.md` file will be linked as `https://github.com/uhop/tape-six-proc/blob/master/README.md`. Always use https://github.com/uhop/tape-six-proc/blob/master/ for the main repository.

When you generate links in the main repository, use relative paths for other files from the same main repository and full path for files located in the wiki directory. For example, use https://github.com/uhop/tape-six-proc/wiki/Utility-‐-tape6‐proc for the utility page. Always use https://github.com/uhop/tape-six-proc/wiki/ for the wiki directory.

File wiki/Home.md is the main page of the wiki. It should present the project overview and links to the main components.
