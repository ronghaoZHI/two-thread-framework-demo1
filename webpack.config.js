const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {
  CleanWebpackPlugin
} = require('clean-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");

console.log(process.env.NODE_ENV)

module.exports = {
  entry: './main.js',
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: './app.js'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, "src"),
    },
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs', '.json'],
  },
  module: {
    rules: [{
        test: /\.jsx?$/,
        include: [path.resolve(__dirname, '')],
        exclude: [path.resolve(__dirname, 'node_modules')],
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ["@babel/preset-env", {
                "targets": "> 0.0%, not dead"
              }]
            ],
						plugins: ["@babel/plugin-transform-react-jsx"],
          },
        }
      },
      // {
      //   test: /\.tsx?$/,
      //   exclude: [path.resolve(__dirname, 'node_modules')],
      //   use: ['ts-loader']
      // },
      {
        test: /\.(png|jpe?g|svg|gif)$/i,
        use: [{
          loader: 'url-loader',
          options: {
            limit: 8192,
            name: '[name].[contenthash].[ext]',
          },
        }, ],
      },
      {
        test: /\.(png|jpe?g|svg|gif)$/i,
        use: [{
          loader: 'file-loader',
          options: {
            name: '[name].[contenthash].[ext]',
          }
        }, ],
      },
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: './public/index.html'
    }),
    new CopyPlugin([{
      from: path.resolve(__dirname, "public"),
      to: path.resolve(__dirname, "dist"),
      ignore: ['index.html']
    }])
  ],
  devtool: "inline-source-map", // 嵌入到源文件中
}