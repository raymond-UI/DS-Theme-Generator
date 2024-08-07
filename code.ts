// import * as StyleDictionary from 'style-dictionary';

figma.showUI(__html__);
figma.ui.resize(400, 500);

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'generate-themes') {
    try {
      const selectedSystems = msg.systems;
      const tokens: { colors: { [key: string]: string }; typography: { [key: string]: { fontFamily: string; fontWeight: string; fontSize: string; lineHeight: number | undefined; letterSpacing: string } }; spacing: { [key: string]: string }; borderRadius: { [key: string]: string }; shadows: { [key: string]: string } } = {
        colors: {},
        typography: {},
        spacing: {},
        borderRadius: {},
        shadows: {}
      };
      const themes: { [key: string]: any } = {}; // Define themes with a specific type

      for (const system of selectedSystems) {
        themes[system] = generateTheme(system, tokens);
      }

      // Create downloadable files
      const files = createDownloadableFiles(themes);

      figma.ui.postMessage({ 
        type: 'generation-complete',
        files: files
      });
    } catch (error: unknown) { // Specify the type of error
      figma.ui.postMessage({ 
        type: 'error',
        message: (error as Error).message // Cast to Error to access message
      });
    }
  }
};

async function extractDesignTokens() {
  const tokens: { colors: { [key: string]: string }; typography: { [key: string]: { fontFamily: string; fontWeight: string; fontSize: string; lineHeight: number | undefined; letterSpacing: string } }; spacing: { [key: string]: string }; borderRadius: { [key: string]: string }; shadows: { [key: string]: string } } = {
    colors: {},
    typography: {},
    spacing: {},
    borderRadius: {},
    shadows: {}
  };

  

  // Extract color styles
  const colorStyles = await figma.getLocalPaintStylesAsync();
  colorStyles.forEach(style => {
    if (style.paints[0].type === 'SOLID') {
      const color = style.paints[0].color;
      tokens.colors[style.name] = rgbToHex(color); // Removed cast, ensure style.name is a valid key
    }
  });

  // Extract text styles
  const textStyles = await figma.getLocalTextStylesAsync();
  textStyles.forEach(style => {
    tokens.typography[style.name] = {
      fontFamily: style.fontName.family,
      fontWeight: style.fontName.style,
      fontSize: `${style.fontSize}px`,
      lineHeight: style.lineHeight.unit === 'AUTO' ? undefined : style.lineHeight.value,
      letterSpacing: `${style.letterSpacing.value}px`
    };
  });

  // Extract effect styles for shadows
  const effectStyles = await figma.getLocalEffectStylesAsync();
  effectStyles.forEach(style => {
    if (style.effects[0].type === 'DROP_SHADOW') {
      const shadow = style.effects[0];
      // Define tokens.shadows as a record with string keys
      tokens.shadows[style.name as string] = `${shadow.offset.x}px ${shadow.offset.y}px ${shadow.radius}px ${rgbaToHex(shadow.color)}`;
    }
  });

  // Extract spacing and border radius from components
  // This is a simplified example and might need adjustment based on your design system
  const components = figma.currentPage.selection; // Use selection instead
  components.forEach(component => {
    if (component.name.includes('spacing')) {
      tokens.spacing[component.name] = `${component.height}px`;
    }
    if (component.name.includes('radius') && 'cornerRadius' in component) {
      tokens.borderRadius[String(component.name)] = `${String(component.cornerRadius)}px`; // Wrap cornerRadius in String(...)
    }
  });

  return tokens;
}

function generateTheme(system: string, tokens: any) { // Specify types for parameters
  switch (system) {
    case 'mui':
      return generateMUITheme(tokens);
    case 'shadcnui':
      return generateShadcnUITheme(tokens);
    case 'chakra':
      return generateChakraTheme(tokens);
    case 'radix':
      return generateRadixTheme(tokens);
    default:
      throw new Error(`Unsupported design system: ${system}`);
  }
}

function generateMUITheme(tokens: { colors: { [key: string]: string }; typography: { [key: string]: { fontFamily: string; fontWeight: string; fontSize: string; lineHeight: number | undefined; letterSpacing: string } }; borderRadius: { [key: string]: string }; shadows: { [key: string]: string } }) {
  const defaultColors = {
    Primary: '#1976d2',
    Secondary: '#9c27b0',
    Error: '#d32f2f',
    Warning: '#ed6c02',
    Info: '#0288d1',
    Success: '#2e7d32',
  };

  const defaultTypography = {
    fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: '14px',
  };

  const defaultBorderRadius = '4';
  const defaultShadows = {
    'Elevation 1': '0px 1px 3px rgba(0, 0, 0, 0.2), 0px 1px 1px rgba(0, 0, 0, 0.14), 0px 2px 1px -1px rgba(0, 0, 0, 0.12)',
    'Elevation 2': '0px 3px 1px -2px rgba(0, 0, 0, 0.2), 0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 1px 5px 0px rgba(0, 0, 0, 0.12)',
    // ... other shadow levels
  };

  return {
    palette: {
      primary: { main: tokens.colors['Primary'] || defaultColors.Primary },
      secondary: { main: tokens.colors['Secondary'] || defaultColors.Secondary },
      error: { main: tokens.colors['Error'] || defaultColors.Error },
      warning: { main: tokens.colors['Warning'] || defaultColors.Warning },
      info: { main: tokens.colors['Info'] || defaultColors.Info },
      success: { main: tokens.colors['Success'] || defaultColors.Success },
    },
    typography: {
      fontFamily: tokens.typography['Body']?.fontFamily || defaultTypography.fontFamily,
      fontSize: parseInt(tokens.typography['Body']?.fontSize) || parseInt(defaultTypography.fontSize),
      h1: tokens.typography['H1'],
      h2: tokens.typography['H2'],
      body1: tokens.typography['Body'],
    },
    shape: {
      borderRadius: parseInt(tokens.borderRadius['Default'] || defaultBorderRadius),
    },
    shadows: [
      'none',
      tokens.shadows['Elevation 1'] || defaultShadows['Elevation 1'],
      tokens.shadows['Elevation 2'] || defaultShadows['Elevation 2'],
      // ... other shadow levels
    ],
    spacing: (factor: number) => `${4 * factor}px`, // MUI uses 8px as the base spacing unit
  };
}

function generateShadcnUITheme(tokens: { colors: { [key: string]: string }; borderRadius: { [key: string]: string }; typography: { [key: string]: { fontSize: string; fontFamily?: string } }; shadows: { [key: string]: string }; spacing: { [key: string]: string } }) {
  return {
    colors: {
      ...tokens.colors,
      primary: tokens.colors['Primary'],
      secondary: tokens.colors['Secondary'],
    },
    borderRadius: tokens.borderRadius,
    fontSizes: Object.entries(tokens.typography).reduce<{ [key: string]: string }>((acc, [key, value]) => {
      acc[key] = value.fontSize;
      return acc;
    }, {}),
    fonts: {
      sans: tokens.typography['Body']?.fontFamily,
    },
    shadows: tokens.shadows,
    space: tokens.spacing,
  };
}

function generateChakraTheme(tokens: { colors: { [key: string]: string }; typography: { [key: string]: { fontFamily: string; fontSize: string } }; borderRadius: { [key: string]: string }; shadows: { [key: string]: string }; spacing: { [key: string]: string } }) {
  return {
    colors: tokens.colors,
    fonts: {
      body: tokens.typography['Body']?.fontFamily,
      heading: tokens.typography['H1']?.fontFamily,
    },
    fontSizes: Object.entries(tokens.typography).reduce<{ [key: string]: string }>((acc, [key, value]) => {
      acc[key.toLowerCase()] = value.fontSize;
      return acc;
    }, {}),
    radii: tokens.borderRadius,
    shadows: tokens.shadows,
    space: tokens.spacing,
  };
}

function generateRadixTheme(tokens: { colors: { [key: string]: string }; typography: { [key: string]: { fontFamily: string; fontSize: string } }; borderRadius: { [key: string]: string }; shadows: { [key: string]: string }; spacing: { [key: string]: string } }) {
  return {
    colors: tokens.colors,
    fonts: {
      untitled: tokens.typography['Body']?.fontFamily,
    },
    fontSizes: Object.entries(tokens.typography).reduce<{ [key: string]: string }>((acc, [key, value]) => {
      acc[key.toLowerCase()] = value.fontSize;
      return acc;
    }, {}),
    radii: tokens.borderRadius,
    shadows: tokens.shadows,
    space: tokens.spacing,
  };
}

function createDownloadableFiles(themes: { [key: string]: any }) { // Specify the type for themes
  const files: { [key: string]: string } = {}; // Define the type for files
  for (const [system, theme] of Object.entries(themes)) {
    switch (system) {
      case 'mui':
        files[`${system}-theme.js`] = `export const theme = ${JSON.stringify(theme, null, 2)};`;
        break;
      case 'shadcnui':
        files[`${system}-theme.json`] = JSON.stringify(theme, null, 2);
        break;
      case 'chakra':
        files[`${system}-theme.js`] = `import { extendTheme } from '@chakra-ui/react';\n\nexport const theme = extendTheme(${JSON.stringify(theme, null, 2)});`;
        break;
      case 'radix':
        files[`${system}-theme.css`] = generateRadixCSS(theme);
        break;
    }
  }
  return files;
}

function generateRadixCSS(theme: { [key: string]: any }) {
  let css = ':root {\n';
  for (const [key, value] of Object.entries(theme)) {
    if (typeof value === 'object') {
      for (const [subKey, subValue] of Object.entries(value)) {
        css += `  --${key}-${subKey}: ${subValue};\n`;
      }
    } else {
      css += `  --${key}: ${value};\n`;
    }
  }
  css += '}';
  return css;
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) { // Specify types for r, g, b
  return "#" + ((1 << 24) + (Math.round(r * 255) << 16) + (Math.round(g * 255) << 8) + Math.round(b * 255)).toString(16).slice(1);
}

function rgbaToHex({ r, g, b, a }: { r: number; g: number; b: number; a: number }) { // Specify types for r, g, b, a
  return "#" + ((1 << 24) + (Math.round(r * 255) << 16) + (Math.round(g * 255) << 8) + Math.round(b * 255)).toString(16).slice(1) +
         Math.round(a * 255).toString(16).padStart(2, '0');
}