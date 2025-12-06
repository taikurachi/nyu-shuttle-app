#!/bin/bash

# NYU Transit Backend Setup Script
# This script helps set up the database and install dependencies

set -e

echo "🚀 NYU Transit Backend Setup"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    echo "   macOS: brew install postgresql@14 postgis"
    echo "   Ubuntu: sudo apt-get install postgresql postgresql-contrib postgis"
    exit 1
fi

echo "✅ PostgreSQL found"
echo ""

# Check if database exists
echo "Checking database..."
if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw nyu_transit; then
    echo "⚠️  Database 'nyu_transit' already exists"
    read -p "Do you want to recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping existing database..."
        psql -U postgres -c "DROP DATABASE IF EXISTS nyu_transit;"
        psql -U postgres -c "CREATE DATABASE nyu_transit;"
    fi
else
    echo "Creating database..."
    psql -U postgres -c "CREATE DATABASE nyu_transit;"
fi

# Enable PostGIS
echo "Enabling PostGIS extension..."
psql -U postgres -d nyu_transit -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Run schema
echo "Setting up database schema..."
cd db
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit backend/db/.env with your PostgreSQL credentials"
fi
psql -U postgres -d nyu_transit -f schema.sql
cd ..

# Install dependencies
echo ""
echo "Installing API dependencies..."
cd api
npm install
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit backend/api/.env with your PostgreSQL credentials"
fi
cd ..

echo ""
echo "Installing database script dependencies..."
cd db
npm install
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit backend/api/.env and backend/db/.env with your PostgreSQL credentials"
echo "2. Run 'cd backend/db && npm run upload-schedule' to populate the database"
echo "3. Run 'cd backend/api && npm run dev' to start the API server"
echo ""

