/**
 * src/structures/OrderQueue.ts
 *
 * Classical Data Structure: FIFO Order Processing Queue
 * Satisfies Academic Syllabus: Data Structures — Queue Implementation & Linked Nodes
 *
 * Guaranteed O(1) enqueue and O(1) dequeue time complexity for high-throughput
 * sequential order fulfillment.
 */

class QueueNode<T> {
  value: T;
  next: QueueNode<T> | null = null;

  constructor(value: T) {
    this.value = value;
  }
}

export class OrderQueue<T = unknown> {
  private head: QueueNode<T> | null = null;
  private tail: QueueNode<T> | null = null;
  private _size: number = 0;

  get size(): number {
    return this._size;
  }

  isEmpty(): boolean {
    return this._size === 0;
  }

  /**
   * Appends an order to the back of the queue.
   * Time Complexity: O(1)
   */
  enqueue(item: T): void {
    const node = new QueueNode(item);
    if (!this.tail) {
      this.head = node;
      this.tail = node;
    } else {
      this.tail.next = node;
      this.tail = node;
    }
    this._size++;
  }

  /**
   * Removes and returns the order at the front of the queue.
   * Time Complexity: O(1)
   */
  dequeue(): T | null {
    if (!this.head) return null;
    const item = this.head.value;
    this.head = this.head.next;
    if (!this.head) {
      this.tail = null;
    }
    this._size--;
    return item;
  }

  /**
   * Inspects the next order without removing it.
   * Time Complexity: O(1)
   */
  peek(): T | null {
    return this.head ? this.head.value : null;
  }

  /**
   * Dispatches and processes all queued orders sequentially.
   */
  processAll(handler: (item: T, index: number) => void): number {
    let processed = 0;
    while (!this.isEmpty()) {
      const item = this.dequeue();
      if (item !== null) {
        handler(item, processed++);
      }
    }
    return processed;
  }
}
