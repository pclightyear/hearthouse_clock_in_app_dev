const path = require('path');
const webpack = require('webpack');

const srcPath = path.resolve(__dirname, 'src');
const distPath = path.resolve(__dirname, 'dist');

module.exports = {
    context: srcPath,
    resolve: {
        alias: {
            images: path.resolve(distPath, 'images')
        }
    },
    entry: './index.js',
    output: {
        path: distPath,
        filename: '[name].bundle.js',
        libraryTarget: 'var',
        library: 'Main'
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            }, {
                test: /\.(png|jpe?g|gif)$/i,
                use: 'url-loader'
            }
        ],
    },
    watch: true
}