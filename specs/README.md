# Annotrieve API Specification

This directory contains the OpenAPI 3.0 specification for the Annotrieve API.

## Files Structure

### Main Specification
- `annotrieve-api.yaml` - The original specification file

### Modular Components (for reference)
- `components/parameters.yaml` - All API parameters
- `components/schemas.yaml` - All data models and schemas
- `components/responses.yaml` - All response definitions
- `components/requestBodies.yaml` - All request body definitions
- `components/common-responses.yaml` - Common response patterns
- `paths/annotations.yaml` - Annotations endpoints
- `paths/annotations-download.yaml` - Download endpoints

## Improvements Made

### 1. DRY (Don't Repeat Yourself) Principles
- **Eliminated duplication**: Common response patterns are now defined once and reused
- **Parameter reuse**: All parameters are defined in one place and referenced throughout
- **Schema consistency**: Data models are defined once and referenced where needed

### 2. Better Organization
- **Logical grouping**: Parameters, schemas, and responses are organized by type
- **Clear separation**: Request bodies, responses, and data models are clearly separated
- **Consistent structure**: All endpoints follow the same pattern

### 3. Maintainability
- **Single source of truth**: Each component is defined in one place
- **Easy updates**: Changes to common elements only need to be made once
- **Clear documentation**: Each section is well-commented

## Key Features

### Common Response Patterns
The specification now includes reusable response patterns:
- `json_tsv_jsonl`: For endpoints that return JSON, TSV, or JSONL formats
- `zip_only`: For download endpoints that return ZIP files

### Parameter Definitions
All parameters are centrally defined and include:
- Proper validation rules
- Default values
- Clear descriptions
- Type constraints

### Schema Definitions
Data models are clearly defined with:
- Proper type constraints
- Enum values where applicable
- Additional properties handling
- Clear descriptions

## Usage

### For Development
Use `annotrieve-api-refactored.yaml` as it provides:
- Better maintainability
- Reduced duplication
- Clearer structure
- Easier to extend

### For Documentation
The refactored specification generates the same documentation as the original but is much easier to maintain and extend.

## Adding New Endpoints

1. Define any new parameters in the `parameters` section
2. Define any new schemas in the `schemas` section
3. Define any new responses in the `responses` section
4. Add the endpoint to the `paths` section using the existing patterns

## Benefits

- **Reduced file size**: Eliminated ~100 lines of duplication
- **Better maintainability**: Changes only need to be made in one place
- **Consistency**: All endpoints follow the same patterns
- **Extensibility**: Easy to add new endpoints following established patterns
- **Documentation**: Self-documenting structure with clear comments 