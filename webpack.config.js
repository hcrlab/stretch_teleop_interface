const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack')

const pages = ['robot', 'operator'];

module.exports = {
  mode: 'development',
    entry: pages.reduce((config, page) => {
        config[page] = `./src/pages/${page}/tsx/index.tsx`;
        return config;
    }, {}),
    output: {
      filename: "[name]/bundle.js",
      path: path.resolve(__dirname, "dist"),
  },
  optimization: {
      splitChunks: {
          chunks: "all",
      },
  },
  node: {
    __dirname: false,
  },
  plugins: [
    // new HtmlWebpackPlugin({
    //   template: './src/pages/operator/html/index.html'
    // }),
    // Work around for Buffer is undefined:
    // https://github.com/webpack/changelog-v5/issues/10
    new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
    }),
    new webpack.ProvidePlugin({
        process: 'process/browser',
    }),
  ].concat(
    pages.map(
        (page) =>
            new HtmlWebpackPlugin({
                inject: true,
                template: `./src/pages/${page}/html/index.html`,
                filename: `${page}/index.html`,
                chunks: [page],
            })
    )
  ),
  module: {
    rules: [
      {
        test: /\.(ts)x?$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {'loose': true}], 
                ["@babel/preset-react", {"runtime": "automatic"}], '@babel/preset-typescript'],
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  externals: {
    'express': 'commonjs express'
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      "fs": false,
      "tls": false,
      "net": false,
      "path": false,
      "zlib": false,
      "http": require.resolve("stream-http"),
      "https": false,
      "crypto": false,
      "url": false,
      "querystring": false,
      "timers": false,
      "os": false,
      "stream": require.resolve("stream-browserify"),
    },
    alias: {
      "shared": path.resolve(__dirname, './src/shared/'),
      "utils": path.resolve(__dirname, './src/utils/'),
      "operator": path.resolve(__dirname, './src/pages/operator/'),
      "robot": path.resolve(__dirname, './src/pages/robot/'),
    }
  },
  // output: {
  //   filename: 'bundle.js',
  //   path: path.resolve(__dirname, 'dist'),
  // },
  devServer: {
    allowedHosts: ['slinky.hcrlab.cs.washington.edu', "localhost:3000"],
    headers: {
      "Access-Control-Allow-Origin": "http://locahost:3000",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    },
    static: path.join(__dirname, "dist"),
    compress: true,
    // port: 3000,
  },
};
