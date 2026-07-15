# Running Multiple WhatsApp Instances

This docker-compose setup supports running multiple isolated WhatsApp instances, each with its own session data and configuration.

## How It Works

The configuration uses environment variables to make volume names, container names, and ports dynamic:

- **`INSTANCE_NAME`**: Unique identifier for each instance (default: `whatsapp-neo2`)
- **`NOVNC_PORT`**: Port for noVNC web interface (default: `3008`)
- **`API_PORT`**: Port for WhatsApp API (default: `3022`)

Each instance gets its own:
- Docker volumes for session persistence
- Container names
- Network namespace
- Port mappings

## Running a Single Instance

```bash
# Use default configuration
docker-compose up -d

# Or specify custom values
INSTANCE_NAME=my-whatsapp NOVNC_PORT=3008 API_PORT=3022 docker-compose up -d
```

## Running Multiple Instances

### Method 1: Using Environment Variables

```bash
# Instance 1
INSTANCE_NAME=whatsapp-client1 NOVNC_PORT=3008 API_PORT=3022 docker-compose up -d

# Instance 2
INSTANCE_NAME=whatsapp-client2 NOVNC_PORT=3009 API_PORT=3023 docker-compose up -d

# Instance 3
INSTANCE_NAME=whatsapp-client3 NOVNC_PORT=3010 API_PORT=3024 docker-compose up -d
```

### Method 2: Using Separate .env Files

Create separate environment files for each instance:

**`.env.instance1`**:
```env
INSTANCE_NAME=whatsapp-client1
NOVNC_PORT=3008
API_PORT=3022
```

**`.env.instance2`**:
```env
INSTANCE_NAME=whatsapp-client2
NOVNC_PORT=3009
API_PORT=3023
```

Then start each instance:
```bash
docker-compose --env-file .env.instance1 up -d
docker-compose --env-file .env.instance2 up -d
```

### Method 3: Using Docker Compose Project Names

```bash
# Instance 1
docker-compose -p whatsapp-client1 up -d

# Instance 2
docker-compose -p whatsapp-client2 up -d
```

**Note**: When using project names, you still need to set different ports to avoid conflicts.

## Managing Instances

### List all running instances
```bash
docker ps --filter "name=whatsapp"
```

### Stop a specific instance
```bash
# Using environment variable
INSTANCE_NAME=whatsapp-client1 docker-compose down

# Or using project name
docker-compose -p whatsapp-client1 down
```

### View logs for a specific instance
```bash
INSTANCE_NAME=whatsapp-client1 docker-compose logs -f
```

### Remove instance data (volumes)
```bash
# This will delete the session data for the instance
INSTANCE_NAME=whatsapp-client1 docker-compose down -v
```

## Volume Names

Each instance creates two named volumes:
- `${INSTANCE_NAME}_session` - WhatsApp session data
- `${INSTANCE_NAME}_chromium_profile` - Browser profile data

You can list all volumes:
```bash
docker volume ls | grep whatsapp
```

## Accessing Instances

Each instance will be accessible on its configured ports:

- **noVNC Interface**: `http://localhost:${NOVNC_PORT}`
- **API Endpoint**: `http://localhost:${API_PORT}`

Example for 3 instances:
- Instance 1: noVNC at `http://localhost:3008`, API at `http://localhost:3022`
- Instance 2: noVNC at `http://localhost:3009`, API at `http://localhost:3023`
- Instance 3: noVNC at `http://localhost:3010`, API at `http://localhost:3024`

## Important Notes

1. **Port Conflicts**: Ensure each instance uses unique ports for both `NOVNC_PORT` and `API_PORT`
2. **Session Isolation**: Each instance maintains completely separate WhatsApp sessions
3. **Resource Usage**: Each instance runs a full Chromium browser, so monitor system resources
4. **Network**: All instances share the external `proxy` network but have isolated internal networks
