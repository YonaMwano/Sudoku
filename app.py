from flask import Flask, render_template, request, jsonify
import random
import copy

app = Flask(__name__)

# ---------- Sudoku Core Logic ----------

def is_valid(board, row, col, num):
    """Check if placing num at board[row][col] is valid."""
    # Check row
    if num in board[row]:
        return False
    # Check column
    if num in [board[i][col] for i in range(9)]:
        return False
    # Check 3x3 box
    box_row, box_col = 3 * (row // 3), 3 * (col // 3)
    for i in range(box_row, box_row + 3):
        for j in range(box_col, box_col + 3):
            if board[i][j] == num:
                return False
    return True


def find_empty(board):
    """Find next empty cell (0)."""
    for i in range(9):
        for j in range(9):
            if board[i][j] == 0:
                return i, j
    return None


def solve(board):
    """Solve Sudoku using backtracking. Modifies board in-place. Returns True if solved."""
    empty = find_empty(board)
    if not empty:
        return True
    row, col = empty
    nums = list(range(1, 10))
    random.shuffle(nums)  # Random order for variety
    for num in nums:
        if is_valid(board, row, col, num):
            board[row][col] = num
            if solve(board):
                return True
            board[row][col] = 0
    return False


def generate_full_board():
    """Generate a complete valid Sudoku board."""
    board = [[0 for _ in range(9)] for _ in range(9)]
    # Fill diagonal 3x3 boxes first (they are independent)
    for box in range(0, 9, 3):
        nums = list(range(1, 10))
        random.shuffle(nums)
        idx = 0
        for i in range(3):
            for j in range(3):
                board[box + i][box + j] = nums[idx]
                idx += 1
    solve(board)
    return board


def count_solutions(board, limit=2):
    """Count number of solutions up to `limit` (for uniqueness check)."""
    board_copy = copy.deepcopy(board)
    count = [0]

    def _solve():
        if count[0] >= limit:
            return
        empty = find_empty(board_copy)
        if not empty:
            count[0] += 1
            return
        row, col = empty
        for num in range(1, 10):
            if is_valid(board_copy, row, col, num):
                board_copy[row][col] = num
                _solve()
                board_copy[row][col] = 0
                if count[0] >= limit:
                    return

    _solve()
    return count[0]


def remove_cells(board, difficulty):
    """
    Remove cells based on difficulty while trying to keep unique solution.
    difficulty: 'easy' | 'medium' | 'hard' | 'expert'
    """
    attempts_map = {
        'easy': 35,
        'medium': 45,
        'hard': 52,
        'expert': 58
    }
    cells_to_remove = attempts_map.get(difficulty, 45)

    puzzle = copy.deepcopy(board)
    positions = [(r, c) for r in range(9) for c in range(9)]
    random.shuffle(positions)

    removed = 0
    for row, col in positions:
        if removed >= cells_to_remove:
            break
        backup = puzzle[row][col]
        puzzle[row][col] = 0
        # Check uniqueness (limit 2 is enough)
        if count_solutions(puzzle, limit=2) != 1:
            puzzle[row][col] = backup  # restore
        else:
            removed += 1

    return puzzle


def generate_puzzle(difficulty='medium'):
    """Generate a full board + puzzle + solution."""
    solution = generate_full_board()
    puzzle = remove_cells(solution, difficulty)
    return {
        'puzzle': puzzle,
        'solution': solution,
        'difficulty': difficulty
    }


# ---------- Routes ----------

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/generate', methods=['POST'])
def api_generate():
    data = request.get_json() or {}
    difficulty = data.get('difficulty', 'medium')
    if difficulty not in ('easy', 'medium', 'hard', 'expert'):
        difficulty = 'medium'
    result = generate_puzzle(difficulty)
    return jsonify({
        'success': True,
        'puzzle': result['puzzle'],
        'solution': result['solution'],
        'difficulty': result['difficulty']
    })


@app.route('/api/check', methods=['POST'])
def api_check():
    data = request.get_json() or {}
    board = data.get('board')
    solution = data.get('solution')
    if not board or not solution:
        return jsonify({'success': False, 'error': 'Missing data'}), 400

    # Validate dimensions
    if len(board) != 9 or any(len(row) != 9 for row in board):
        return jsonify({'success': False, 'error': 'Invalid board'}), 400

    errors = []
    complete = True
    for i in range(9):
        for j in range(9):
            val = board[i][j]
            if val == 0 or val is None:
                complete = False
                continue
            if val != solution[i][j]:
                errors.append({'row': i, 'col': j})

    return jsonify({
        'success': True,
        'complete': complete and len(errors) == 0,
        'errors': errors,
        'correct_count': 81 - len([1 for r in board for c in r if c == 0 or c is None]) - len(errors)
    })


@app.route('/api/hint', methods=['POST'])
def api_hint():
    data = request.get_json() or {}
    board = data.get('board')
    solution = data.get('solution')
    if not board or not solution:
        return jsonify({'success': False, 'error': 'Missing data'}), 400

    empty_cells = [(i, j) for i in range(9) for j in range(9)
                   if board[i][j] == 0 or board[i][j] is None]
    if not empty_cells:
        return jsonify({'success': False, 'error': 'No empty cells'})

    row, col = random.choice(empty_cells)
    return jsonify({
        'success': True,
        'row': row,
        'col': col,
        'value': solution[row][col]
    })


@app.route('/api/solve', methods=['POST'])
def api_solve():
    data = request.get_json() or {}
    solution = data.get('solution')
    if not solution:
        return jsonify({'success': False, 'error': 'Missing solution'}), 400
    return jsonify({
        'success': True,
        'solution': solution
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
