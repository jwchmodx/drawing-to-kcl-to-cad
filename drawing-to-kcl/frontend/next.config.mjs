import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Tauri 빌드를 위한 정적 내보내기
  output: process.env.TAURI_BUILD ? 'export' : undefined,
  webpack: (config, { isServer, webpack }) => {
    // Enable WebAssembly support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Handle WASM files - use asset/resource to emit WASM files as separate assets
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/wasm/[name][ext]',
      },
    });

    // Ignore wasmer_wasi_js_bg.wasm resolution errors during build
    // This file is loaded dynamically at runtime by @wasmer/wasi
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['wasmer_wasi_js_bg.wasm'] = false;

    // Provide Buffer polyfill for browser (required by @wasmer/wasi)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: require.resolve('buffer/'),
      };

      config.plugins = [
        ...(config.plugins || []),
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
        }),
      ];
    }

    // Configure output for WASM files
    if (!isServer) {
      config.output = config.output || {};
      config.output.webassemblyModuleFilename = 'static/wasm/[modulehash].wasm';
    }

    return config;
  },
};

export default nextConfig;

