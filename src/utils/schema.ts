/**
 * Format JSON Schema in a readable way
 */
export function formatJsonSchema(schema: any, indent: string = ''): void {
  if (schema.type) {
    console.log(`${indent}Type: ${schema.type}`);
  }

  if (schema.properties) {
    console.log(`${indent}Parameters:`);
    const required = schema.required || [];
    
    Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
      const isRequired = required.includes(propName);
      const requiredText = isRequired ? ' (required)' : ' (optional)';
      
      console.log(`${indent}  • ${propName}${requiredText}`);
      
      if (propSchema.type) {
        console.log(`${indent}    Type: ${propSchema.type}`);
      }
      
      if (propSchema.description) {
        console.log(`${indent}    Description: ${propSchema.description}`);
      }
      
      if (propSchema.enum) {
        console.log(`${indent}    Allowed values: ${propSchema.enum.join(', ')}`);
      }
      
      if (propSchema.default !== undefined) {
        console.log(`${indent}    Default: ${propSchema.default}`);
      }
      
      if (propSchema.minimum !== undefined || propSchema.maximum !== undefined) {
        const range: string[] = [];
        if (propSchema.minimum !== undefined) range.push(`min: ${propSchema.minimum}`);
        if (propSchema.maximum !== undefined) range.push(`max: ${propSchema.maximum}`);
        console.log(`${indent}    Range: ${range.join(', ')}`);
      }
      
      console.log();
    });
  }

  if (schema.items && schema.type === 'array') {
    console.log(`${indent}Array items:`);
    formatJsonSchema(schema.items, indent + '  ');
  }
}

/**
 * Generate example arguments from a JSON schema
 */
export function generateExampleArgs(schema: any): Record<string, any> {
  const example: Record<string, any> = {};
  
  if (schema.properties) {
    const required = schema.required || [];
    
    Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
      // Only include required fields in the example, or fields with defaults
      if (required.includes(propName) || propSchema.default !== undefined) {
        example[propName] = generateExampleValue(propSchema);
      }
    });
  }
  
  return example;
}

/**
 * Generate an example value for a JSON schema property
 */
export function generateExampleValue(schema: any): any {
  if (schema.default !== undefined) {
    return schema.default;
  }
  
  if (schema.enum && schema.enum.length > 0) {
    return schema.enum[0];
  }
  
  switch (schema.type) {
    case 'string':
      return schema.description ? `"${schema.description.toLowerCase().replace(/\s+/g, '_')}"` : '"example"';
    case 'number':
    case 'integer':
      return schema.minimum !== undefined ? schema.minimum : 42;
    case 'boolean':
      return true;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return null;
  }
} 