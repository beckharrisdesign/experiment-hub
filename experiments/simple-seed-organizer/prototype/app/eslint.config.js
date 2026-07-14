// eslint-config-next 16+ ships native flat config — no FlatCompat bridge.
const nextCoreWebVitals = require("eslint-config-next/core-web-vitals");

module.exports = [
  ...(nextCoreWebVitals.default || nextCoreWebVitals),
  { ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"] },
  {
    rules: {
      // Allow setState in useEffect for initial data loading from localStorage
      "react-hooks/set-state-in-effect": "off",
    },
  },
];
