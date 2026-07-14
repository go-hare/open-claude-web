/**
 * Official SharedHighlight themes (cb4f243f3 `claude-light` / `claude-dark` / `claude-darker`).
 * Registered via Pierre registerCustomTheme; used by Code PierreWorkerPool (c119 `sg` / `md` / `Th`).
 * Extracted from ion-dist; do not invent colors.
 */
import type { ThemeRegistration } from "@pierre/diffs";

export const OFFICIAL_CLAUDE_LIGHT_THEME = {
  "name": "claude-light",
  "type": "light",
  "colors": {
    "editor.background": "#ffffff",
    "editor.foreground": "#1a1a1a",
    "terminal.background": "#ffffff",
    "terminal.foreground": "#1a1a1a",
    "terminalCursor.foreground": "#0073e6",
    "terminalCursor.background": "#ffffff",
    "terminal.ansiBlack": "#1a1a1a",
    "terminal.ansiRed": "#ff3a30",
    "terminal.ansiGreen": "#1e9e3c",
    "terminal.ansiYellow": "#98801f",
    "terminal.ansiBlue": "#0073e6",
    "terminal.ansiMagenta": "#cd2054",
    "terminal.ansiCyan": "#8e6bd9",
    "terminal.ansiWhite": "#999999",
    "terminal.ansiBrightBlack": "#666666",
    "terminal.ansiBrightRed": "#ff5047",
    "terminal.ansiBrightGreen": "#1e9e3c",
    "terminal.ansiBrightYellow": "#98801f",
    "terminal.ansiBrightBlue": "#0078f0",
    "terminal.ansiBrightMagenta": "#cd2054",
    "terminal.ansiBrightCyan": "#8e6bd9",
    "terminal.ansiBrightWhite": "#d6d6d6",
    "gitDecoration.addedResourceForeground": "#1e9e3c",
    "gitDecoration.deletedResourceForeground": "#ff3a30",
    "gitDecoration.modifiedResourceForeground": "#0073e6"
  },
  "tokenColors": [
    {
      "scope": [
        "comment",
        "punctuation.definition.comment"
      ],
      "settings": {
        "foreground": "#999999",
        "fontStyle": "italic"
      }
    },
    {
      "scope": [
        "string",
        "punctuation.definition.string"
      ],
      "settings": {
        "foreground": "#1e9e3c"
      }
    },
    {
      "scope": [
        "constant.numeric",
        "constant.language",
        "constant.character",
        "keyword.other.unit"
      ],
      "settings": {
        "foreground": "#cd2054"
      }
    },
    {
      "scope": [
        "keyword",
        "storage.type",
        "storage.modifier",
        "keyword.operator.new",
        "keyword.operator.expression"
      ],
      "settings": {
        "foreground": "#c5621b"
      }
    },
    {
      "scope": [
        "entity.name.function",
        "support.function",
        "meta.function-call.generic"
      ],
      "settings": {
        "foreground": "#0073e6"
      }
    },
    {
      "scope": [
        "entity.name.type",
        "entity.name.class",
        "entity.other.inherited-class",
        "support.type",
        "support.class"
      ],
      "settings": {
        "foreground": "#8e6bd9"
      }
    },
    {
      "scope": [
        "variable",
        "meta.definition.variable.name",
        "support.variable",
        "variable.parameter",
        "variable.other.property",
        "meta.object-literal.key",
        "support.type.property-name"
      ],
      "settings": {
        "foreground": "#1a1a1a"
      }
    },
    {
      "scope": [
        "punctuation",
        "meta.brace",
        "keyword.operator"
      ],
      "settings": {
        "foreground": "#737373"
      }
    },
    {
      "scope": [
        "entity.name.tag",
        "punctuation.definition.tag"
      ],
      "settings": {
        "foreground": "#c5621b"
      }
    },
    {
      "scope": [
        "entity.other.attribute-name"
      ],
      "settings": {
        "foreground": "#0073e6"
      }
    },
    {
      "scope": [
        "string.regexp",
        "constant.character.escape"
      ],
      "settings": {
        "foreground": "#98801f"
      }
    },
    {
      "scope": [
        "markup.heading",
        "entity.name.section"
      ],
      "settings": {
        "foreground": "#0073e6",
        "fontStyle": "bold"
      }
    },
    {
      "scope": [
        "markup.bold"
      ],
      "settings": {
        "fontStyle": "bold"
      }
    },
    {
      "scope": [
        "markup.italic"
      ],
      "settings": {
        "fontStyle": "italic"
      }
    },
    {
      "scope": [
        "markup.inserted",
        "punctuation.definition.inserted"
      ],
      "settings": {
        "foreground": "#1e9e3c"
      }
    },
    {
      "scope": [
        "markup.deleted",
        "punctuation.definition.deleted"
      ],
      "settings": {
        "foreground": "#ff3a30"
      }
    },
    {
      "scope": [
        "invalid",
        "invalid.illegal"
      ],
      "settings": {
        "foreground": "#ff3a30"
      }
    }
  ]
} as ThemeRegistration;

export const OFFICIAL_CLAUDE_DARK_THEME = {
  "name": "claude-dark",
  "type": "dark",
  "colors": {
    "editor.background": "#262626",
    "editor.foreground": "#ededed",
    "terminal.background": "#262626",
    "terminal.foreground": "#ededed",
    "terminalCursor.foreground": "#0099ff",
    "terminalCursor.background": "#262626",
    "terminal.ansiBlack": "#0a0a0a",
    "terminal.ansiRed": "#ff3a30",
    "terminal.ansiGreen": "#32d74b",
    "terminal.ansiYellow": "#ffd014",
    "terminal.ansiBlue": "#0099ff",
    "terminal.ansiMagenta": "#ff2c56",
    "terminal.ansiCyan": "#b796ff",
    "terminal.ansiWhite": "#a6a6a6",
    "terminal.ansiBrightBlack": "#525252",
    "terminal.ansiBrightRed": "#ff5047",
    "terminal.ansiBrightGreen": "#32d74b",
    "terminal.ansiBrightYellow": "#ffd014",
    "terminal.ansiBrightBlue": "#0087ee",
    "terminal.ansiBrightMagenta": "#ff2c56",
    "terminal.ansiBrightCyan": "#b796ff",
    "terminal.ansiBrightWhite": "#ededed",
    "gitDecoration.addedResourceForeground": "#32d74b",
    "gitDecoration.deletedResourceForeground": "#ff3a30",
    "gitDecoration.modifiedResourceForeground": "#0099ff"
  },
  "tokenColors": [
    {
      "scope": [
        "comment",
        "punctuation.definition.comment"
      ],
      "settings": {
        "foreground": "#737373",
        "fontStyle": "italic"
      }
    },
    {
      "scope": [
        "string",
        "punctuation.definition.string"
      ],
      "settings": {
        "foreground": "#32d74b"
      }
    },
    {
      "scope": [
        "constant.numeric",
        "constant.language",
        "constant.character",
        "keyword.other.unit"
      ],
      "settings": {
        "foreground": "#ff2c56"
      }
    },
    {
      "scope": [
        "keyword",
        "storage.type",
        "storage.modifier",
        "keyword.operator.new",
        "keyword.operator.expression"
      ],
      "settings": {
        "foreground": "#fa832e"
      }
    },
    {
      "scope": [
        "entity.name.function",
        "support.function",
        "meta.function-call.generic"
      ],
      "settings": {
        "foreground": "#0099ff"
      }
    },
    {
      "scope": [
        "entity.name.type",
        "entity.name.class",
        "entity.other.inherited-class",
        "support.type",
        "support.class"
      ],
      "settings": {
        "foreground": "#b796ff"
      }
    },
    {
      "scope": [
        "variable",
        "meta.definition.variable.name",
        "support.variable",
        "variable.parameter",
        "variable.other.property",
        "meta.object-literal.key",
        "support.type.property-name"
      ],
      "settings": {
        "foreground": "#ededed"
      }
    },
    {
      "scope": [
        "punctuation",
        "meta.brace",
        "keyword.operator"
      ],
      "settings": {
        "foreground": "#a6a6a6"
      }
    },
    {
      "scope": [
        "entity.name.tag",
        "punctuation.definition.tag"
      ],
      "settings": {
        "foreground": "#fa832e"
      }
    },
    {
      "scope": [
        "entity.other.attribute-name"
      ],
      "settings": {
        "foreground": "#0099ff"
      }
    },
    {
      "scope": [
        "string.regexp",
        "constant.character.escape"
      ],
      "settings": {
        "foreground": "#ffd014"
      }
    },
    {
      "scope": [
        "markup.heading",
        "entity.name.section"
      ],
      "settings": {
        "foreground": "#0099ff",
        "fontStyle": "bold"
      }
    },
    {
      "scope": [
        "markup.bold"
      ],
      "settings": {
        "fontStyle": "bold"
      }
    },
    {
      "scope": [
        "markup.italic"
      ],
      "settings": {
        "fontStyle": "italic"
      }
    },
    {
      "scope": [
        "markup.inserted",
        "punctuation.definition.inserted"
      ],
      "settings": {
        "foreground": "#32d74b"
      }
    },
    {
      "scope": [
        "markup.deleted",
        "punctuation.definition.deleted"
      ],
      "settings": {
        "foreground": "#ff3a30"
      }
    },
    {
      "scope": [
        "invalid",
        "invalid.illegal"
      ],
      "settings": {
        "foreground": "#ff3a30"
      }
    }
  ]
} as ThemeRegistration;

export const OFFICIAL_CLAUDE_DARKER_THEME = {
  "name": "claude-darker",
  "type": "dark",
  "colors": {
    "editor.background": "#121212",
    "editor.foreground": "#ededed",
    "terminal.background": "#121212",
    "terminal.foreground": "#ededed",
    "terminalCursor.foreground": "#0099ff",
    "terminalCursor.background": "#121212",
    "terminal.ansiBlack": "#0a0a0a",
    "terminal.ansiRed": "#ff3a30",
    "terminal.ansiGreen": "#32d74b",
    "terminal.ansiYellow": "#ffd014",
    "terminal.ansiBlue": "#0099ff",
    "terminal.ansiMagenta": "#ff2c56",
    "terminal.ansiCyan": "#b796ff",
    "terminal.ansiWhite": "#a6a6a6",
    "terminal.ansiBrightBlack": "#525252",
    "terminal.ansiBrightRed": "#ff5047",
    "terminal.ansiBrightGreen": "#32d74b",
    "terminal.ansiBrightYellow": "#ffd014",
    "terminal.ansiBrightBlue": "#0087ee",
    "terminal.ansiBrightMagenta": "#ff2c56",
    "terminal.ansiBrightCyan": "#b796ff",
    "terminal.ansiBrightWhite": "#ededed",
    "gitDecoration.addedResourceForeground": "#32d74b",
    "gitDecoration.deletedResourceForeground": "#ff3a30",
    "gitDecoration.modifiedResourceForeground": "#0099ff"
  },
  "tokenColors": [
    {
      "scope": [
        "comment",
        "punctuation.definition.comment"
      ],
      "settings": {
        "foreground": "#737373",
        "fontStyle": "italic"
      }
    },
    {
      "scope": [
        "string",
        "punctuation.definition.string"
      ],
      "settings": {
        "foreground": "#32d74b"
      }
    },
    {
      "scope": [
        "constant.numeric",
        "constant.language",
        "constant.character",
        "keyword.other.unit"
      ],
      "settings": {
        "foreground": "#ff2c56"
      }
    },
    {
      "scope": [
        "keyword",
        "storage.type",
        "storage.modifier",
        "keyword.operator.new",
        "keyword.operator.expression"
      ],
      "settings": {
        "foreground": "#fa832e"
      }
    },
    {
      "scope": [
        "entity.name.function",
        "support.function",
        "meta.function-call.generic"
      ],
      "settings": {
        "foreground": "#0099ff"
      }
    },
    {
      "scope": [
        "entity.name.type",
        "entity.name.class",
        "entity.other.inherited-class",
        "support.type",
        "support.class"
      ],
      "settings": {
        "foreground": "#b796ff"
      }
    },
    {
      "scope": [
        "variable",
        "meta.definition.variable.name",
        "support.variable",
        "variable.parameter",
        "variable.other.property",
        "meta.object-literal.key",
        "support.type.property-name"
      ],
      "settings": {
        "foreground": "#ededed"
      }
    },
    {
      "scope": [
        "punctuation",
        "meta.brace",
        "keyword.operator"
      ],
      "settings": {
        "foreground": "#a6a6a6"
      }
    },
    {
      "scope": [
        "entity.name.tag",
        "punctuation.definition.tag"
      ],
      "settings": {
        "foreground": "#fa832e"
      }
    },
    {
      "scope": [
        "entity.other.attribute-name"
      ],
      "settings": {
        "foreground": "#0099ff"
      }
    },
    {
      "scope": [
        "string.regexp",
        "constant.character.escape"
      ],
      "settings": {
        "foreground": "#ffd014"
      }
    },
    {
      "scope": [
        "markup.heading",
        "entity.name.section"
      ],
      "settings": {
        "foreground": "#0099ff",
        "fontStyle": "bold"
      }
    },
    {
      "scope": [
        "markup.bold"
      ],
      "settings": {
        "fontStyle": "bold"
      }
    },
    {
      "scope": [
        "markup.italic"
      ],
      "settings": {
        "fontStyle": "italic"
      }
    },
    {
      "scope": [
        "markup.inserted",
        "punctuation.definition.inserted"
      ],
      "settings": {
        "foreground": "#32d74b"
      }
    },
    {
      "scope": [
        "markup.deleted",
        "punctuation.definition.deleted"
      ],
      "settings": {
        "foreground": "#ff3a30"
      }
    },
    {
      "scope": [
        "invalid",
        "invalid.illegal"
      ],
      "settings": {
        "foreground": "#ff3a30"
      }
    }
  ]
} as ThemeRegistration;

export const OFFICIAL_CLAUDE_THEME_NAMES = {
  light: "claude-light",
  dark: "claude-dark",
  darker: "claude-darker",
} as const;
