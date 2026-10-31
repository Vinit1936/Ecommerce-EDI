/**
 * src/domain/team1.ts
 *
 * Object-Oriented Domain Entities — Team 1 (Customer & Product Management)
 * Satisfies Academic Syllabus: Object-Oriented Programming (Classes, Encapsulation, Methods)
 */
import bcrypt from 'bcryptjs';

export type UserRole = 'CUSTOMER' | 'ADMIN' | 'VENDOR';

/**
 * Domain entity representing an authenticated user account.
 * Encapsulates security credentials and status controls.
 */
export class User {
  private _id: string;
  private _email: string;
  private _role: UserRole;
  private _isActive: boolean;
  private _passwordHash: string;
  private _lastLoginAt?: Date;

  constructor(
    id: string,
    email: string,
    role: UserRole = 'CUSTOMER',
    passwordHash: string = '',
    isActive: boolean = true
  ) {
    this._id = id;
    this._email = email.toLowerCase().trim();
    this._role = role;
    this._passwordHash = passwordHash;
    this._isActive = isActive;
  }

  get id(): string {
    return this._id;
  }

  get email(): string {
    return this._email;
  }

  get role(): UserRole {
    return this._role;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get lastLoginAt(): Date | undefined {
    return this._lastLoginAt;
  }

  async verifyPassword(candidate: string): Promise<boolean> {
    if (!this._passwordHash) return false;
    return bcrypt.compare(candidate, this._passwordHash);
  }

  async setPassword(newPassword: string): Promise<void> {
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters in length');
    }
    const salt = await bcrypt.genSalt(10);
    this._passwordHash = await bcrypt.hash(newPassword, salt);
  }

  recordLogin(): void {
    if (!this._isActive) throw new Error('Cannot record login on deactivated account');
    this._lastLoginAt = new Date();
  }

  deactivate(): void {
    this._isActive = false;
  }

  activate(): void {
    this._isActive = true;
  }
}

/**
 * Domain entity representing a customer identity and shipping profile.
 */
export class Customer {
  private _id: string;
  private _user: User;
  private _firstName: string;
  private _lastName: string;
  private _phone?: string;
  private _address: string;
  private _city: string;
  private _postalCode?: string;
  private _country: string;

  constructor(params: {
    id: string;
    user: User;
    firstName: string;
    lastName: string;
    phone?: string;
    address: string;
    city: string;
    postalCode?: string;
    country: string;
  }) {
    this._id = params.id;
    this._user = params.user;
    this._firstName = params.firstName;
    this._lastName = params.lastName;
    this._phone = params.phone;
    this._address = params.address;
    this._city = params.city;
    this._postalCode = params.postalCode;
    this._country = params.country;
  }

  get id(): string {
    return this._id;
  }

  get user(): User {
    return this._user;
  }

  get fullName(): string {
    return `${this._firstName} ${this._lastName}`.trim();
  }

  get shippingAddressString(): string {
    return `${this._address}, ${this._city}${this._postalCode ? ` ${this._postalCode}` : ''}, ${this._country}`;
  }

  updateAddress(address: string, city: string, postalCode?: string, country?: string): void {
    this._address = address;
    this._city = city;
    if (postalCode) this._postalCode = postalCode;
    if (country) this._country = country;
  }
}

/**
 * Domain entity representing a product in the catalog.
 */
export class Product {
  private _id: string;
  private _sku: string;
  private _name: string;
  private _price: number;
  private _originalPrice?: number;
  private _stockQty: number;
  private _category: Category;
  private _brand: Brand;

  constructor(params: {
    id: string;
    sku: string;
    name: string;
    price: number;
    originalPrice?: number;
    stockQty: number;
    category: Category;
    brand: Brand;
  }) {
    if (params.price < 0) throw new Error('Product price must be non-negative');
    this._id = params.id;
    this._sku = params.sku;
    this._name = params.name;
    this._price = params.price;
    this._originalPrice = params.originalPrice;
    this._stockQty = Math.max(0, params.stockQty);
    this._category = params.category;
    this._brand = params.brand;
  }

  get id(): string {
    return this._id;
  }

  get sku(): string {
    return this._sku;
  }

  get name(): string {
    return this._name;
  }

  get price(): number {
    return this._price;
  }

  get stockQty(): number {
    return this._stockQty;
  }

  get category(): Category {
    return this._category;
  }

  get brand(): Brand {
    return this._brand;
  }

  get isSale(): boolean {
    return !!this._originalPrice && this._originalPrice > this._price;
  }

  hasAvailableStock(quantity: number): boolean {
    return this._stockQty >= quantity;
  }

  reserveStock(quantity: number): void {
    if (quantity <= 0) throw new Error('Quantity must be positive');
    if (!this.hasAvailableStock(quantity)) {
      throw new Error(`Insufficient inventory: requested ${quantity}, available ${this._stockQty}`);
    }
    this._stockQty -= quantity;
  }

  restock(quantity: number): void {
    if (quantity <= 0) throw new Error('Restock quantity must be positive');
    this._stockQty += quantity;
  }

  applyDiscount(percent: number): void {
    if (percent <= 0 || percent >= 100) throw new Error('Discount percentage must be between 1 and 99');
    this._originalPrice = this._price;
    this._price = Number((this._price * (1 - percent / 100)).toFixed(2));
  }
}

/**
 * Domain entity representing a category in a hierarchical self-referencing tree.
 */
export class Category {
  private _id: string;
  private _name: string;
  private _parentCategory?: Category;
  private _subCategories: Category[] = [];

  constructor(id: string, name: string, parentCategory?: Category) {
    this._id = id;
    this._name = name;
    this._parentCategory = parentCategory;
    if (parentCategory) {
      parentCategory.addSubCategory(this);
    }
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get parent(): Category | undefined {
    return this._parentCategory;
  }

  get subCategories(): Category[] {
    return [...this._subCategories];
  }

  addSubCategory(category: Category): void {
    if (!this._subCategories.some((c) => c.id === category.id)) {
      this._subCategories.push(category);
    }
  }

  getFullHierarchyPath(): string {
    if (this._parentCategory) {
      return `${this._parentCategory.getFullHierarchyPath()} > ${this._name}`;
    }
    return this._name;
  }
}

/**
 * Domain entity representing a brand or atelier.
 */
export class Brand {
  private _id: string;
  private _name: string;
  private _products: Product[] = [];

  constructor(id: string, name: string) {
    this._id = id;
    this._name = name;
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get products(): Product[] {
    return [...this._products];
  }

  addProduct(product: Product): void {
    if (!this._products.some((p) => p.id === product.id)) {
      this._products.push(product);
    }
  }

  getProductCount(): number {
    return this._products.length;
  }
}
