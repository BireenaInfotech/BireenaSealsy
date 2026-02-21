const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

/**
 * 🔒 WEBPACK PRODUCTION BUILD CONFIGURATION
 * Obfuscates and minifies JavaScript code to prevent code visibility in browser
 */

module.exports = {
    mode: 'production',
    entry: {
        // Add all your main JavaScript files here
        main: './frontend/public/js/main.js',
        // Add more entry points as needed
        // dashboard: './frontend/public/js/dashboard.js',
        // billing: './frontend/public/js/billing.js',
    },
    output: {
        path: path.resolve(__dirname, 'frontend/public/dist'),
        filename: '[name].bundle.js',
        clean: true, // Clean the output directory before emit
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    // 🔒 Maximum obfuscation settings
                    compress: {
                        drop_console: true, // Remove all console.log
                        drop_debugger: true, // Remove debugger statements
                        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove specific functions
                        passes: 3, // Multiple passes for better compression
                        dead_code: true, // Remove unreachable code
                        conditionals: true, // Optimize if statements
                        evaluate: true, // Evaluate constant expressions
                        booleans: true, // Optimize boolean expressions
                        loops: true, // Optimize loops
                        unused: true, // Remove unused variables
                        hoist_funs: true, // Hoist function declarations
                        hoist_vars: true, // Hoist variable declarations
                        if_return: true, // Optimize if/return and if/continue
                        join_vars: true, // Join var declarations
                        side_effects: true, // Drop side-effect-free statements
                    },
                    mangle: {
                        // 🔒 Mangle variable and function names
                        toplevel: true, // Mangle names declared in the top level scope
                        eval: true, // Mangle names in scopes where eval is used
                        safari10: true, // Work around Safari 10/11 bugs
                        properties: {
                            // Mangle property names
                            regex: /^_/, // Only mangle properties starting with underscore
                        },
                    },
                    format: {
                        comments: false, // Remove all comments
                        ascii_only: true, // Escape Unicode characters
                        beautify: false, // Minify output
                    },
                    // 🔒 Additional security
                    keep_classnames: false, // Don't keep class names
                    keep_fnames: false, // Don't keep function names
                },
                extractComments: false, // Don't extract comments to separate file
                parallel: true, // Use multi-process parallel running
            }),
        ],
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    priority: 10,
                },
                common: {
                    minChunks: 2,
                    priority: 5,
                    reuseExistingChunk: true,
                },
            },
        },
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            [
                                '@babel/preset-env',
                                {
                                    targets: {
                                        browsers: ['last 2 versions', 'ie >= 11'],
                                    },
                                },
                            ],
                        ],
                    },
                },
            },
        ],
    },
    performance: {
        hints: false, // Disable performance hints for large bundles
        maxEntrypointSize: 512000,
        maxAssetSize: 512000,
    },
    devtool: false, // 🔒 IMPORTANT: No source maps in production!
};
