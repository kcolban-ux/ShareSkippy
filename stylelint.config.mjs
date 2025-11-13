/** @type {import("stylelint").Config} */
const stylelintConfig = {
  extends: ['stylelint-config-standard', 'stylelint-config-tailwindcss'],
  rules: {
    'color-hex-length': 'short',
    'declaration-block-no-duplicate-properties': true,
    'declaration-block-no-redundant-longhand-properties': true,
    'no-duplicate-selectors': true,
  },
};

export default stylelintConfig;
