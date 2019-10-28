const path = require('path');

module.exports = {
    mode: 'none',
    entry: './src/index_amd.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'lwfrontend.js',
        libraryTarget: 'amd',
        libraryExport: 'default',
        jsonpFunction: 'lw_amocrm_widget',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"]
    },
    devtool: 'eval'
};