const path = require("path");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    devtool: "source-map",
    watch: true,

    entry: {
        script: path.resolve("src/js", "script.js"),
    },

    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].js"
    },

    resolve: {
        modules: [
            path.resolve(__dirname, "src"),
            path.resolve(__dirname, "node_modules")
        ]
    },

    module: {
        rules: [{
            test: /\.js$/,
            exclude: /(node_modules)/,
            use: {
                loader: "babel-loader",
                options: {
                    plugins: ['@babel/plugin-proposal-class-properties']
                }
            }
        },{
            test: /\.css$/,
            use: [
                MiniCssExtractPlugin.loader,
                {
                    loader: 'css-loader', options: {}
                },{
                    loader: 'sass-loader', options:  {}
                }
            ],
        }]
    },
    plugins: [
        new CopyWebpackPlugin([{ from: 'src/css', to: './css' }])
    ]
};