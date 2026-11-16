export const defineMonacoThemes = (monaco: any) => {
  const transparentBackground = '#00000000';

  const baseColors = {
    'editor.background': transparentBackground,
    'editorGutter.background': transparentBackground,
    'editorLineNumber.foreground': 'rgba(255, 255, 255, 0.3)',
    'editorLineNumber.activeForeground': '#ffffff',
    'editor.lineHighlightBackground': transparentBackground,
    'editor.lineHighlightBorder': transparentBackground,
    'editorOverviewRuler.border': transparentBackground,
  };

  monaco.editor.defineTheme('amoled', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5c5c5c', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff5555' },
      { token: 'string', foreground: 'f1fa8c' },
    ],
    colors: {
      ...baseColors,
      'editor.foreground': '#f8f8f2',
      'editor.selectionBackground': '#44475a80',
    }
  });

  monaco.editor.defineTheme('nord', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '4c566a', fontStyle: 'italic' },
      { token: 'keyword', foreground: '81a1c1' },
      { token: 'string', foreground: 'a3be8c' },
    ],
    colors: {
      ...baseColors,
      'editor.foreground': '#d8dee9',
      'editor.selectionBackground': '#434c5e80',
    }
  });

  monaco.editor.defineTheme('dracula', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff79c6' },
      { token: 'string', foreground: 'f1fa8c' },
    ],
    colors: {
      ...baseColors,
      'editor.foreground': '#f8f8f2',
      'editor.selectionBackground': '#44475a80',
    }
  });

  monaco.editor.defineTheme('solarized', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '93a1a1', fontStyle: 'italic' },
      { token: 'keyword', foreground: '859900' },
      { token: 'string', foreground: '2aa198' },
    ],
    colors: {
      ...baseColors,
      'editor.foreground': '#657b83',
      'editor.selectionBackground': '#eee8d580',
    }
  });

  monaco.editor.defineTheme('catppuccin', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6e738d', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'cba6f7' },
      { token: 'string', foreground: 'a6e3a1' },
    ],
    colors: {
      ...baseColors,
      'editor.foreground': '#cdd6f4',
      'editor.selectionBackground': '#585b7080',
    }
  });

  monaco.editor.defineTheme('cyberpunk', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '00ff9f', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff003c' },
      { token: 'string', foreground: 'fcee0a' },
    ],
    colors: {
      ...baseColors,
      'editor.foreground': '#00ffff',
      'editor.selectionBackground': '#711c9180',
    }
  });

  monaco.editor.defineTheme('glass', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: 'a0aabf', fontStyle: 'italic' },
      { token: 'keyword', foreground: '82aaff' },
      { token: 'string', foreground: 'c3e88d' },
    ],
    colors: {
      ...baseColors,
      'editor.foreground': '#eeffff',
      'editor.selectionBackground': '#80cbc440',
    }
  });
};
