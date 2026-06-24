const { FlatCompat } = require("@eslint/eslintrc");
const path = require("path");

const compat = new FlatCompat({ baseDirectory: __dirname });

module.exports = [
  ...compat.extends("next/core-web-vitals"),
  { ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"] },
  {
    rules: {
      // Allow setState in useEffect for initial data loading from localStorage
      "react-hooks/set-state-in-effect": "off",
    },
  },
];
