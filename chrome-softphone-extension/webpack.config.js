const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: process.env.NODE_ENV === "development" ? "development" : "production",
  entry: {
    main: "./src/index.js",
    background: "./background.js",
    content: "./content.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules\/(?!sip.js)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "public" },
        { from: "manifest.json" },
        { from: "logo.png", to: "logo.png" },
      ],
    }),
  ],
  performance: {
    hints: "warning",
    maxAssetSize: 500000, // in bytes
    maxEntrypointSize: 500000, // in bytes
    assetFilter: function (assetFilename) {
      return !/\.png$/.test(assetFilename);
    },
  },
  devtool:
    process.env.NODE_ENV === "development"
      ? "inline-source-map"
      : "cheap-module-source-map",
};
