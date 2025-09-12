module.exports = {
	apps: [
		{
			name: "cinetune-video-editor",
			script: "server.js",
			cwd: "/opt/cinetune/CineTune_Frontend/.next/standalone",
			instances: 1,
			exec_mode: "fork",
			watch: false,
			max_memory_restart: "1G",
			env: {
				NODE_ENV: "production",
				PORT: 3000,
				HOSTNAME: "0.0.0.0",
			},
			env_production: {
				NODE_ENV: "production",
				PORT: 3000,
				HOSTNAME: "0.0.0.0",
			},
			log_file: "/var/log/cinetune/combined.log",
			out_file: "/var/log/cinetune/out.log",
			error_file: "/var/log/cinetune/error.log",
			log_date_format: "YYYY-MM-DD HH:mm:ss Z",
			merge_logs: true,
			autorestart: true,
			restart_delay: 5000,
			max_restarts: 10,
			min_uptime: "10s",
			node_args: "--max-old-space-size=2048",
		},
	],
};