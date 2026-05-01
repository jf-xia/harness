import 'dotenv/config';
import React from 'react';
import { render } from 'ink';
import { App } from './app.js';
import { log } from './logger.js';

log.step('APP', 'Harness CLI starting...');
log.info('APP', `Node ${process.version}, PID ${process.pid}`);
log.info('APP', `Working directory: ${process.cwd()}`);

render(<App />);
