var path = require('path')
var webpack = require('webpack')

module.exports = {
    devtool: 'source-map',
    entry: [
        'webpack-hot-middleware/client',
        './mywebsites/messenger/chat'
    ],
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'bundle.js',
        publicPath: '/static/'
    },
    plugins: [
        new webpack.optimize.OccurrenceOrderPlugin(),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.optimize.UglifyJsPlugin()
    ],
    module: {
        loaders: [
            {
                test: /\.js$/,
                loaders: ['babel'],
                exclude: /node_modules/,
                include: __dirname
            },
            {
                test: /\.json$/,
                loaders: ['json-loader'],
                exclude: /node_modules/,
                include: __dirname
            }
        ]
    }
}
