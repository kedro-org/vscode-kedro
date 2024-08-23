const { override, addBabelPreset, addWebpackModuleRule } = require('customize-cra');

module.exports = override(
  addBabelPreset('@babel/preset-react'),
  addWebpackModuleRule({
    test: /\.(js|jsx)$/,
    exclude: /node_modules/,
    use: {
      loader: 'babel-loader',
      options: {
        presets: ['@babel/preset-env', '@babel/preset-react']
      }
    }
  }),
  (config) => {
    // Disable code splitting
    config.optimization.splitChunks = {
      cacheGroups: {
        default: false,
      },
    };
    config.optimization.runtimeChunk = false;

    // Customize JS output filenames
    config.output.filename = 'static/js/[name].js';
    config.output.chunkFilename = 'static/js/[name].chunk.js';

    // Customize CSS output filenames
    config.plugins.forEach((plugin) => {
      if (plugin.constructor.name === 'MiniCssExtractPlugin') {
        plugin.options.filename = 'static/css/[name].css';
        plugin.options.chunkFilename = 'static/css/[name].chunk.css';
      }
    });

    return config;
  }
);
