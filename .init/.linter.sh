#!/bin/bash
cd /tmp/kavia/workspace/code-generation/smart-todo-list-237557-237571/todo_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

