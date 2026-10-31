/**
 * src/structures/NotificationStack.ts
 *
 * Classical Data Structure: LIFO Notification & Event Stack
 * Satisfies Academic Syllabus: Data Structures — Stack Implementation & LIFO Dispatch
 *
 * Guaranteed O(1) push and O(1) pop time complexity for immediate access
 * to the most recent user notifications and telemetry alerts.
 */

class StackNode<T> {
  value: T;
  next: StackNode<T> | null = null;

  constructor(value: T, next: StackNode<T> | null = null) {
    this.value = value;
    this.next = next;
  }
}

export class NotificationStack<T = unknown> {
  private top: StackNode<T> | null = null;
  private _size: number = 0;

  get size(): number {
    return this._size;
  }

  isEmpty(): boolean {
    return this._size === 0;
  }

  /**
   * Pushes a new notification onto the top of the stack.
   * Time Complexity: O(1)
   */
  push(item: T): void {
    this.top = new StackNode(item, this.top);
    this._size++;
  }

  /**
   * Pops and returns the most recent notification from the top of the stack.
   * Time Complexity: O(1)
   */
  pop(): T | null {
    if (!this.top) return null;
    const item = this.top.value;
    this.top = this.top.next;
    this._size--;
    return item;
  }

  /**
   * Inspects the most recent notification without removing it.
   * Time Complexity: O(1)
   */
  peek(): T | null {
    return this.top ? this.top.value : null;
  }

  /**
   * Drains the stack in reverse chronological (LIFO) order.
   */
  drain(): T[] {
    const list: T[] = [];
    while (!this.isEmpty()) {
      const item = this.pop();
      if (item !== null) list.push(item);
    }
    return list;
  }
}
