# 2.0.6
- Fixed request bodies being sent as `[object Object]` instead of JSON
- Fixed paths with multiple methods overwriting each other in the OpenAPI document
- Fixed colliding type names overwriting and corrupting generated files
- Fixed error responses being inferred into schemas
- Fixed the CLI exiting successfully without doing anything
- Added `--params` for substituting path parameters from the CLI
- Added `generate.markdown.timestamp` to keep generated Markdown byte-stable
- Improved CLI error reporting for malformed JSON arguments and missing config

# 2.0.5
- Fixed component naming for routes using dashes and underscores
- Added union deduplication for generated type output

# 2.0.4
- Added discriminator name scoring to prefer configured names and common patterns
- Improved literal value handling to support numbers, booleans, and null in addition to strings
- Fixed duplicate types in output when the same schema is used in multiple places
- Improved type output formatting

# 2.0.3
- Improved component output naming

# 2.0.2
- Removed unnecessary dependency types from bundle
- Bumped dependencies

# 2.0.1
- Added markdown to default generate options
- Updated documentation

# 2.0.0
- Added generate option "markdown"
- Added typescript type generation
- Moved openapi typescript type generation to a different config option
- Updated CLI option "generate" to accept multiple values
- Updated dependencies

# 1.1.0
- Added additional CLI arguments for sending a single probe without config file
- Refactored zod schema parsing and generation
- Updated dependencies

# 1.0.0
- Added JSON Schema generation support
- Updated OpenAPI generation to include more components
- Bumped dependencies

# 0.4.4
- Bumped dependencies

# 0.4.3
- Included all types in default export

# 0.4.2
- Updated default output directory

# 0.4.1
- Added usage via CLI

# 0.4.0
- Updated array schema nested object merging

# 0.3.0
- Updated array schema creation algorithm

# 0.2.0
- Added hooks support for custom logic during the probing process

# 0.1.1
- Added support for discriminated unions in array samples

# 0.1.0
- Added typescript type generation
- Added body schema inferring

# 0.0.6
- Added schema entries to the OpenAPI output for better clarity.
- Fixed minor bugs in the probing logic.

# 0.0.5
- Updated configuration options for better flexibility.
- Added CI configuration for automated testing and deployment.
- Improved error handling during API probing.
- Enhanced logging for better debugging and traceability.

# 0.0.1 - 0.0.4
- Initial releases with basic functionality for probing APIs and generating OpenAPI schemas.
