import asyncio
from agents.tools.registry import get_tool

async def main():
    tool = get_tool("send_notification")
    print(tool.name)
    print(tool.args)

if __name__ == "__main__":
    asyncio.run(main())
