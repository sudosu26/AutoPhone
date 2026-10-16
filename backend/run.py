"""PhonePilot backend entry point script."""

import os
import sys
from pathlib import Path


def main():
    """Start the PhonePilot backend server."""
    # Ensure we're running from the backend directory or its parent
    backend_dir = Path(__file__).resolve().parent
    os.chdir(backend_dir)

    # Load .env file if it exists
    env_file = backend_dir / ".env"
    if env_file.exists():
        try:
            from dotenv import load_dotenv
            load_dotenv(env_file)
            print(f"[PhonePilot] Loaded config from {env_file}")
        except ImportError:
            print("[PhonePilot] python-dotenv not installed, reading from environment variables.")

    # Import settings after env is loaded
    from app.config import settings

    # Print startup info
    print("=" * 50)
    print("  PhonePilot Backend")
    print("=" * 50)
    print(f"  Host:     {settings.phonepilot_host}")
    print(f"  Port:     {settings.phonepilot_port}")
    print(f"  Database: {settings.phonepilot_db_path}")
    print(f"  Sandbox:  {settings.phonepilot_sandbox_dir}")
    print(f"  Log Level: {settings.phonepilot_log_level}")
    print(f"  API Docs: http://localhost:{settings.phonepilot_port}/docs")
    print("=" * 50)

    # Check for --reload flag
    reload_mode = "--reload" in sys.argv

    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.phonepilot_host,
        port=settings.phonepilot_port,
        reload=reload_mode,
        log_level=settings.phonepilot_log_level.lower(),
    )


if __name__ == "__main__":
    main()
