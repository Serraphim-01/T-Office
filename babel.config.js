module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current',
      },
      modules: 'commonjs', // This is important for Node.js
    }],
  ],
};