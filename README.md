# Smart Helpdesk with Agentic Triage

An AI-powered customer support automation system that streamlines ticket management through intelligent triage and automated responses.

## Features

- **Multi-Role Authentication**: Secure access control for Admin, Support Agent, and End User roles
- **Knowledge Base Management**: Centralized repository of support articles with AI-powered search
- **Intelligent Ticket Triage**: Automated classification and response generation with confidence scoring
- **Human Oversight**: Agent review interface for AI suggestions with manual intervention capabilities
- **Comprehensive Audit Logging**: Complete traceability of all system actions with trace IDs
- **Real-time Updates**: Live notifications and status updates across the platform

## Technology Stack

### Frontend
- React 18+ with Vite
- Tailwind CSS for styling
- React Router for navigation
- Axios for API communication
- React Hook Form for form management

### Backend
- Node.js with Express.js
- MongoDB with Mongoose ODM
- JWT authentication with refresh tokens
- Redis for job queuing (optional)
- Winston for structured logging

### AI Integration
- Configurable AI providers (OpenAI, etc.)
- Deterministic fallbacks for reliability
- Confidence-based auto-resolution

## Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB 6+
- Redis (optional, for job queue)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd smart-helpdesk
```

2. Install dependencies:
```bash
npm run install:all
```

3. Set up environment variables:
```bash
cp server/.env.example server/.env
# Edit server/.env with your configuration
```

4. Seed the database:
```bash
cd server
npm run seed
```

5. Start the development servers:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### Default Login Credentials
```
Admin:  admin@example.com / admin123
Agent:  agent@example.com / agent123
User:   user@example.com / user123
```

## Project Structure

```
smart-helpdesk/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API service functions
│   │   ├── store/          # State management
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
├── server/                 # Node.js backend API
│   ├── controllers/        # Route handlers
│   ├── middleware/         # Express middleware
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API route definitions
│   ├── services/           # Business logic
│   ├── utils/              # Utility functions
│   └── tests/              # Test files
└── docs/                   # Documentation
```

## API Documentation

The API follows RESTful conventions with the following main endpoints:

- `POST /api/auth/login` - User authentication
- `GET /api/tickets` - List tickets
- `POST /api/tickets` - Create new ticket
- `GET /api/kb/articles` - List knowledge base articles
- `POST /api/agent/process` - Trigger AI processing

For detailed API documentation, see [API.md](docs/API.md).

## 🤖 AI Configuration

### STUB_MODE
Set `STUB_MODE=true` in your `.env` file to use deterministic AI responses for testing and demonstration purposes. This mode provides:
- Predictable classification results
- Consistent confidence scores
- Reliable auto-resolution decisions
- No external API dependencies

### Production AI
For production use with real AI services:
1. Set `STUB_MODE=false`
2. Configure your AI provider API keys
3. Adjust confidence thresholds in admin panel

## 📊 Key Features Demonstrated

### Agentic Workflow System
- **Intelligent Classification** - Automatic categorization (billing/technical/shipping/other)
- **Knowledge Retrieval** - Semantic search through knowledge base articles
- **Response Generation** - AI-generated draft responses with citations
- **Confidence Scoring** - Multi-factor confidence assessment
- **Auto-Resolution** - Automatic ticket closure for high-confidence cases
- **Human Review** - Agent oversight for AI suggestions

### Comprehensive Audit Trail
- Complete activity tracking with trace IDs
- User action logging
- AI decision tracking
- Performance metrics collection

## Development

### Running Tests
```bash
npm test                    # Run all tests
npm run server:test         # Run backend tests only
npm run client:test         # Run frontend tests only
```

### Code Quality
```bash
npm run lint                # Run linting
npm run lint:fix            # Fix linting issues
```

## Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment
```bash
docker-compose up -d
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.
