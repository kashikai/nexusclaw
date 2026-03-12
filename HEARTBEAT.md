# Daily NexusClaw Update (9AM Tokyo)
session_status  # Time check
cd nexusclaw
git status --short
forge test --no-match-test skip | head -10
git log --oneline -3
echo "NexusClaw: Tests green? Deploy tx? SDK progress?"
memory_search "NexusClaw todos"
