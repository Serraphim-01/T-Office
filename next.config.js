/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // This is a workaround for a bug in Next.js that causes a build error when using the `@radix-ui/react-progress` component.
    // The error is caused by a `console.error` statement in the `@radix-ui/react-progress` package that uses a template literal.
    // The build tool is not able to parse the template literal correctly, which causes a syntax error.
    // This workaround uses the `string-replace-loader` to remove the `console.error` statement from the `@radix-ui/react-progress` package.
    // This is a temporary solution until the bug is fixed in Next.js.
    config.module.rules.push({
      test: /@radix-ui\/react-progress\/dist\/index\.mjs$/,
      loader: 'string-replace-loader',
      options: {
        search: /console\.error\(\s*`.*`\s*\);/g,
        replace: '',
      },
    });
    return config;
  },
};

module.exports = nextConfig;
