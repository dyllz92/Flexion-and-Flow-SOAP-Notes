module.exports = {
  apps: [
    {
      name: 'soap-note-generator',
      script: 'node',
      args: 'dist/server.js',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        DATA_DIR: '/home/user/webapp/data'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
