import type {Component, AttributeOptions} from '@liaison/component';
import {Attribute} from '@liaison/component';
import {PromiseLikeable, hasOwnProperty, Constructor} from 'core-helpers';

// TODO: Find a way to remove this useless import
// I did that to remove a TypeScript error in the generated declaration file
// @ts-ignore
import type {Property} from '@liaison/component';

import {StorablePropertyMixin, StorablePropertyOptions} from './storable-property';
import {assertIsStorableClassOrInstance} from '../utilities';

export type StorableAttributeOptions = StorablePropertyOptions &
  AttributeOptions & {
    loader?: StorableAttributeLoader;
    beforeLoad?: StorableAttributeHook;
    afterLoad?: StorableAttributeHook;
    beforeSave?: StorableAttributeHook;
    afterSave?: StorableAttributeHook;
    beforeDelete?: StorableAttributeHook;
    afterDelete?: StorableAttributeHook;
  };

export type StorableAttributeLoader = () => PromiseLikeable<unknown>;

export type StorableAttributeHook = () => PromiseLikeable<void>;

export type StorableAttributeHookName =
  | 'beforeLoad'
  | 'afterLoad'
  | 'beforeSave'
  | 'afterSave'
  | 'beforeDelete'
  | 'afterDelete';

export const StorableAttributeMixin = <T extends Constructor<typeof Attribute>>(Base: T) =>
  class extends StorablePropertyMixin(Base) {
    // === Options ===

    setOptions(options: StorableAttributeOptions = {}) {
      const {
        loader,
        beforeLoad,
        afterLoad,
        beforeSave,
        afterSave,
        beforeDelete,
        afterDelete,
        ...otherOptions
      } = options;

      if (loader !== undefined) {
        this.setLoader(loader);
      }

      if (beforeLoad !== undefined) {
        this.setHook('beforeLoad', beforeLoad);
      }

      if (afterLoad !== undefined) {
        this.setHook('afterLoad', afterLoad);
      }

      if (beforeSave !== undefined) {
        this.setHook('beforeSave', beforeSave);
      }

      if (afterSave !== undefined) {
        this.setHook('afterSave', afterSave);
      }

      if (beforeDelete !== undefined) {
        this.setHook('beforeDelete', beforeDelete);
      }

      if (afterDelete !== undefined) {
        this.setHook('afterDelete', afterDelete);
      }

      super.setOptions(otherOptions);
    }

    // === 'isControlled' mark

    isControlled() {
      return super.isControlled() || this.isComputed();
    }

    // === Loader ===

    _loader: StorableAttributeLoader | undefined;

    getLoader() {
      return this._loader;
    }

    hasLoader() {
      return this.getLoader() !== undefined;
    }

    setLoader(loader: StorableAttributeLoader) {
      this._loader = loader;
    }

    async callLoader() {
      const loader = this.getLoader();

      if (loader === undefined) {
        throw new Error(`Cannot call a loader that is missing (${this.describe()})`);
      }

      return await loader.call(this.getParent());
    }

    isComputed() {
      return this.hasLoader() || this.hasFinder();
    }

    // === Hooks ===

    getHook(name: StorableAttributeHookName) {
      return this._getHooks()[name];
    }

    hasHook(name: StorableAttributeHookName) {
      return name in this._getHooks();
    }

    setHook(name: StorableAttributeHookName, hook: StorableAttributeHook) {
      this._getHooks(true)[name] = hook;
    }

    async callHook(name: StorableAttributeHookName) {
      const hook = this.getHook(name);

      if (hook === undefined) {
        throw new Error(`Cannot call a hook that is missing (${this.describe()}, hook: '${name}')`);
      }

      await hook.call(this.getParent());
    }

    _hooks!: Partial<Record<StorableAttributeHookName, StorableAttributeHook>>;

    _getHooks(autoFork = false) {
      if (this._hooks === undefined) {
        Object.defineProperty(this, '_hooks', {
          value: Object.create(null)
        });
      } else if (autoFork && !hasOwnProperty(this, '_hooks')) {
        Object.defineProperty(this, '_hooks', {
          value: Object.create(this._hooks)
        });
      }

      return this._hooks;
    }

    // === Utilities ===

    static isStorableAttribute(value: any): value is StorableAttribute {
      return isStorableAttributeInstance(value);
    }
  };

export function isStorableAttributeClass(value: any): value is typeof StorableAttribute {
  return typeof value?.isStorableAttribute === 'function';
}

export function isStorableAttributeInstance(value: any): value is StorableAttribute {
  return isStorableAttributeClass(value?.constructor) === true;
}

/**
 * *Inherits from [`Attribute`](https://liaison.dev/docs/v1/reference/attribute) and [`StorableProperty`](https://liaison.dev/docs/v1/reference/storable-property).*
 *
 * The `StorableAttribute` class extends the [`Attribute`](https://liaison.dev/docs/v1/reference/attribute) class with some capabilities such as [computed attributes](https://liaison.dev/docs/v1/reference/storable-attribute#computed-attributes) or [hooks](https://liaison.dev/docs/v1/reference/storable-attribute#hooks).
 *
 * #### Usage
 *
 * Typically, you create a `StorableAttribute` and associate it to a [storable component](https://liaison.dev/docs/v1/reference/storable#storable-component-class) using the [`@attribute()`](https://liaison.dev/docs/v1/reference/storable#attribute-decorator) decorator.
 *
 * For example, here is how you would define a `Movie` component with some attributes:
 *
 * ```
 * // JS
 *
 * import {Component} from '﹫liaison/component';
 * import {Storable, primaryIdentifier, attribute} from '﹫liaison/storable';
 *
 * class Movie extends Storable(Component) {
 *   ﹫primaryIdentifier() id;
 *
 *   ﹫attribute('string') title = '';
 *
 *   ﹫attribute('number') rating;
 *
 *   ﹫attribute('Date') releaseDate;
 * }
 * ```
 *
 * ```
 * // TS
 *
 * import {Component} from '﹫liaison/component';
 * import {Storable, primaryIdentifier, attribute} from '﹫liaison/storable';
 *
 * class Movie extends Storable(Component) {
 *   ﹫primaryIdentifier() id!: string;
 *
 *   ﹫attribute('string') title = '';
 *
 *   ﹫attribute('number') rating!: number;
 *
 *   ﹫attribute('Date') releaseDate!: Date;
 * }
 * ```
 *
 * So far we've defined some storable attributes in the same way we would do with [regular attributes](https://liaison.dev/docs/v1/reference/attribute). The only difference is that we imported the [`@attribute()`](https://liaison.dev/docs/v1/reference/storable#attribute-decorator) decorator from `﹫liaison/storable` instead of `﹫liaison/component`.
 *
 * Let's now see how to take advantage of some capabilities that are unique to storable attributes.
 *
 * ##### Computed Attributes
 *
 * A computed attribute is a special kind of component attribute that computes its value when the component is loaded with a storable component method such as [`load()`](https://liaison.dev/docs/v1/reference/storable#load-instance-method), [`get()`](https://liaison.dev/docs/v1/reference/storable#get-class-method), or [`find()`](https://liaison.dev/docs/v1/reference/storable#find-class-method).
 *
 * The value of a computed attribute shouldn't be set manually, and is not persisted when you [save](https://liaison.dev/docs/v1/reference/storable#save-instance-method) a component to a store.
 *
 * ###### Loaders
 *
 * Use the [`@loader()`](https://liaison.dev/docs/v1/reference/storable#loader-decorator) decorator to specify the function that computes the value of a computed attribute.
 *
 * For example, let's define a `isTrending` computed attribute that determines its value according to the movie's `rating` and `releaseDate`:
 *
 * ```
 * // JS
 *
 * import {loader} from '﹫liaison/storable';
 *
 * class Movie extends Storable(Component) {
 *   // ...
 *
 *   @loader(async function() {
 *     await this.load({rating: true, releaseDate: true});
 *
 *     const ratingLimit = 7;
 *     const releaseDateLimit = new Date(Date.now() - 864000000); // 10 days before
 *
 *     return this.rating >= ratingLimit && this.releaseDate >= releaseDateLimit;
 *   })
 *   @attribute('boolean')
 *   isTrending;
 * }
 * ```
 *
 * ```
 * // TS
 *
 * import {loader} from '﹫liaison/storable';
 *
 * class Movie extends Storable(Component) {
 *   // ...
 *
 *   @loader(async function(this: Movie) {
 *     await this.load({rating: true, releaseDate: true});
 *
 *     const ratingLimit = 7;
 *     const releaseDateLimit = new Date(Date.now() - 864000000); // 10 days before
 *
 *     return this.rating >= ratingLimit && this.releaseDate >= releaseDateLimit;
 *   })
 *   @attribute('boolean')
 *   isTrending!: boolean;
 * }
 * ```
 *
 * Then, when we get a movie, we can get the `isTrending` computed attribute like any attribute:
 *
 * ```
 * const movie = await Movie.get('abc123', {title: true, isTrending: true});
 *
 * movie.title; // => 'Inception'
 * movie.isTrending; // => true (on July 16th, 2010)
 * ```
 *
 * ###### Finders
 *
 * The best thing about computed attributes is that they can be used in a [`Query`](https://liaison.dev/docs/v1/reference/query) when you are [finding](https://liaison.dev/docs/v1/reference/storable#find-class-method) or [counting](https://liaison.dev/docs/v1/reference/storable#count-class-method) some storable components.
 *
 * To enable that, use the [`@finder()`](https://liaison.dev/docs/v1/reference/storable#finder-decorator) decorator, and specify a function that returns a [`Query`](https://liaison.dev/docs/v1/reference/query).
 *
 * For example, let's make our `isTrending` attribute searchable by adding a finder:
 *
 * ```
 * // JS
 *
 * import {loader} from '﹫liaison/storable';
 *
 * class Movie extends Storable(Component) {
 *   // ...
 *
 *   @loader(
 *     // ...
 *   )
 *   @finder(function (isTrending) {
 *     const ratingLimit = 7;
 *     const releaseDateLimit = new Date(Date.now() - 864000000); // 10 days before
 *
 *     if (isTrending) {
 *       // Return a query for `{isTrending: true}`
 *       return {
 *         rating: {$greaterThanOrEqual: ratingLimit}
 *         releaseDate: {$greaterThanOrEqual: releaseDateLimit}
 *       };
 *     }
 *
 *     // Return a query for `{isTrending: false}`
 *     return {
 *       $or: [
 *         {rating: {$lessThan: ratingLimit}},
 *         {releaseDate: {$lessThan: releaseDateLimit}}
 *       ]
 *     };
 *   })
 *   @attribute('boolean')
 *   isTrending;
 * }
 * ```
 *
 * ```
 * // TS
 *
 * import {loader} from '﹫liaison/storable';
 *
 * class Movie extends Storable(Component) {
 *   // ...
 *
 *   @loader(
 *     // ...
 *   )
 *   @finder(function (isTrending: boolean) {
 *     const ratingLimit = 7;
 *     const releaseDateLimit = new Date(Date.now() - 864000000); // 10 days before
 *
 *     if (isTrending) {
 *       // Return a query for `{isTrending: true}`
 *       return {
 *         rating: {$greaterThanOrEqual: ratingLimit}
 *         releaseDate: {$greaterThanOrEqual: releaseDateLimit}
 *       };
 *     }
 *
 *     // Return a query for `{isTrending: false}`
 *     return {
 *       $or: [
 *         {rating: {$lessThan: ratingLimit}},
 *         {releaseDate: {$lessThan: releaseDateLimit}}
 *       ]
 *     };
 *   })
 *   @attribute('boolean')
 *   isTrending!: boolean;
 * }
 * ```
 *
 * And now, we can query our `isTrending` computed attribute like we would do with any attribute:
 *
 * ```
 * await Movie.find({isTrending: true}); // => All trending movies
 * await Movie.find({isTrending: false}); // => All non-trending movies
 *
 * await Movie.count({isTrending: true}); // => Number of trending movies
 * await Movie.count({isTrending: false}); // => Number of non-trending movies
 *
 * // Combine computed attributes with regular attributes to find
 * // all Japanese trending movies
 * await Movie.find({country: 'Japan', isTrending: true});
 * ```
 *
 * ##### Hooks
 *
 * Storable attributes offer a number of hooks that you can use to execute some custom logic when an attribute is loaded, saved or deleted.
 *
 * To define a hook for a storable attribute, use one of the following [`@attribute()`](https://liaison.dev/docs/v1/reference/storable#attribute-decorator) options:
 *
 * - `beforeLoad`: Specifies a [`Hook`](https://liaison.dev/docs/v1/reference/storable-attribute#hook-type) to be executed *before* an attribute is *loaded*.
 * - `afterLoad`: Specifies a [`Hook`](https://liaison.dev/docs/v1/reference/storable-attribute#hook-type) to be executed *after* an attribute is *loaded*.
 * - `beforeSave`: Specifies a [`Hook`](https://liaison.dev/docs/v1/reference/storable-attribute#hook-type) to be executed *before* an attribute is *saved*.
 * - `afterSave`: Specifies a [`Hook`](https://liaison.dev/docs/v1/reference/storable-attribute#hook-type) to be executed *after* an attribute is *saved*.
 * - `beforeDelete`: Specifies a [`Hook`](https://liaison.dev/docs/v1/reference/storable-attribute#hook-type) to be executed *before* an attribute is *deleted*.
 * - `afterDelete`: Specifies a [`Hook`](https://liaison.dev/docs/v1/reference/storable-attribute#hook-type) to be executed *after* an attribute is *deleted*.
 *
 * For example, we could use a `beforeSave` hook to make sure a user's password is hashed before it is saved to a store:
 *
 * ```
 * // JS
 *
 * import {Component} from '﹫liaison/component';
 * import {Storable, primaryIdentifier, attribute} from '﹫liaison/storable';
 * import bcrypt from 'bcryptjs';
 *
 * class User extends Storable(Component) {
 *   ﹫primaryIdentifier() id;
 *
 *   ﹫attribute('string') username;
 *
 *   ﹫attribute('string', {
 *     async beforeSave() {
 *       this.password = await bcrypt.hash(this.password);
 *     }
 *   })
 *   password;
 * }
 * ```
 *
 * ```
 * // TS
 *
 * import {Component} from '﹫liaison/component';
 * import {Storable, primaryIdentifier, attribute} from '﹫liaison/storable';
 * import bcrypt from 'bcryptjs';
 *
 * class User extends Storable(Component) {
 *   ﹫primaryIdentifier() id!: string;
 *
 *   ﹫attribute('string') username!: string;
 *
 *   ﹫attribute('string', {
 *     async beforeSave(this: User) {
 *       this.password = await bcrypt.hash(this.password);
 *     }
 *   })
 *   password!: string;
 * }
 * ```
 *
 * Then, when we save a user, its password gets automatically hashed:
 * ```
 * const user = new User({username: 'steve', password: 'zyx98765'});
 *
 * user.password; // => 'zyx98765'
 *
 * await user.save(); // The password will be hashed before saved to the store
 *
 * user.password; // => '$2y$12$AGJ91pnqlM7TcqnLg0iIFuiN80z9k.wFnGVl1a4lrANUepBKmvNVO'
 *
 * // Note that if we save the user again, as long as its password hasn't changed,
 * // it will not be saved, and therefore not be hashed again
 *
 * user.username = 'steve2';
 * await user.save(); // Only the username will be saved
 *
 * user.password; // => '$2y$12$AGJ91pnqlM7TcqnLg0iIFuiN80z9k.wFnGVl1a4lrANUepBKmvNVO'
 * ```
 */
export class StorableAttribute extends StorableAttributeMixin(Attribute) {
  /**
   * Creates a storable attribute. Typically, instead of using this constructor, you would rather use the [`@attribute()`](https://liaison.dev/docs/v1/reference/storable#attribute-decorator) decorator.
   *
   * @param name The name of the attribute.
   * @param parent The [storable component](https://liaison.dev/docs/v1/reference/storable#storable-component-class) class, prototype, or instance that owns the attribute.
   * @param [options.valueType] A string specifying the [type of values](https://liaison.dev/docs/v1/reference/value-type#supported-types) the attribute can store (default: `'any'`).
   * @param [options.default] The default value (or a function returning the default value) of the attribute.
   * @param [options.validators] An array of [validators](https://liaison.dev/docs/v1/reference/validator) for the value of the attribute.
   * @param [options.items.validators] An array of [validators](https://liaison.dev/docs/v1/reference/validator) for the items of an array attribute.
   * @param [options.loader] A function specifying a [`Loader`](https://liaison.dev/docs/v1/reference/storable-attribute#loader-type) for the attribute.
   * @param [options.finder] A function specifying a [`Finder`](https://liaison.dev/docs/v1/reference/storable-property#finder-type) for the attribute.
   * @param [options.beforeLoad] A function specifying a "beforeLoad" [`hook`](https://liaison.dev/docs/v1/reference/storable-attribute#hook-type) for the attribute.
   * @param [options.afterLoad] A function specifying an "afterLoad" [`hook`](https://liaison.dev/docs/v1/reference/storable-attribute#hook-type) for the attribute.
   * @param [options.beforeSave] A function specifying a "beforeSave" [`hook`](https://liaison.dev/docs/v1/reference/storable-attribute#hook-type) for the attribute.
   * @param [options.afterSave] A function specifying an "afterSave" [`hook`](https://liaison.dev/docs/v1/reference/storable-attribute#hook-type) for the attribute.
   * @param [options.beforeDelete] A function specifying a "beforeDelete" [`hook`](https://liaison.dev/docs/v1/reference/storable-attribute#hook-type) for the attribute.
   * @param [options.afterDelete] A function specifying an "afterDelete" [`hook`](https://liaison.dev/docs/v1/reference/storable-attribute#hook-type) for the attribute.
   * @param [options.exposure] A [`PropertyExposure`](https://liaison.dev/docs/v1/reference/property#property-exposure-type) object specifying how the attribute should be exposed to remote access.
   *
   * @returns The [`StorableAttribute`](https://liaison.dev/docs/v1/reference/storable-attribute) instance that was created.
   *
   * @category Creation
   */
  constructor(
    name: string,
    parent: typeof Component | Component,
    options: StorableAttributeOptions = {}
  ) {
    assertIsStorableClassOrInstance(parent);

    super(name, parent, options);
  }

  /**
   * @method getLoader
   *
   * Returns the [`Loader`](https://liaison.dev/docs/v1/reference/storable-attribute#loader-type) of the attribute.
   *
   * @returns A [`Loader`](https://liaison.dev/docs/v1/reference/storable-attribute#loader-type) function (or `undefined` if the attribute has no associated loader).
   *
   * @category Loader
   */

  /**
   * @method hasLoader
   *
   * Returns whether the attribute has a [`Loader`](https://liaison.dev/docs/v1/reference/storable-attribute#loader-type).
   *
   * @returns A boolean.
   *
   * @category Loader
   */

  /**
   * @method setLoader
   *
   * Sets a [`Loader`](https://liaison.dev/docs/v1/reference/storable-attribute#loader-type) for the attribute.
   *
   * @param loader The [`Loader`](https://liaison.dev/docs/v1/reference/storable-attribute#loader-type) function to set.
   *
   * @category Loader
   */

  /**
   * @typedef Loader
   *
   * A function representing the "loader" of an attribute.
   *
   * The function should return a value for the attribute that is being loaded. Typically, you would return a value according to the value of some other attributes.
   *
   * The function can be `async` and is executed with the parent of the attribute as `this` context.
   *
   * See an example of use in the ["Computed Attributes"](https://liaison.dev/docs/v1/reference/storable-attribute#computed-attributes) section above.
   *
   * @category Loader
   */

  /**
   * @method getHook
   *
   * Returns a specific [`Hook`](https://liaison.dev/docs/v1/reference/storable-attribute#hook-type) for the current attribute.
   *
   * @param name A string representing the name of the hook you want to get. The possible values are `'beforeLoad'`, `'afterLoad'`, `'beforeSave'`, `'afterSave'`, `'beforeDelete'`, and `'afterDelete'`.
   *
   * @returns A [`Hook`](https://liaison.dev/docs/v1/reference/storable-attribute#hook-type) function (or `undefined` if the attribute doesn't have a hook with the specified `name`).
   *
   * @category Hook
   */

  /**
   * @method hasHook
   *
   * Returns whether the current attribute has a specific [`Hook`](https://liaison.dev/docs/v1/reference/storable-attribute#hook-type).
   *
   * @param name A string representing the name of the hook you want to check. The possible values are `'beforeLoad'`, `'afterLoad'`, `'beforeSave'`, `'afterSave'`, `'beforeDelete'`, and `'afterDelete'`.
   *
   * @returns A boolean.
   *
   * @category Hook
   */

  /**
   * @method setHook
   *
   * Sets a [`Hook`](https://liaison.dev/docs/v1/reference/storable-attribute#hook-type) for the current attribute.
   *
   * @param name A string representing the name of the hook you want to set. The possible values are `'beforeLoad'`, `'afterLoad'`, `'beforeSave'`, `'afterSave'`, `'beforeDelete'`, and `'afterDelete'`.
   * @param hook The [`Hook`](https://liaison.dev/docs/v1/reference/storable-attribute#hook-type) function to set.
   *
   * @category Hook
   */

  /**
   * @typedef Hook
   *
   * A function representing a "hook" of an attribute.
   *
   * According to the type of the hook, the function is automatically called when an attribute is loaded, saved or deleted.
   *
   * The function can be `async` and is invoked with the parent of the attribute as `this` context.
   *
   * See an example of use in the ["Hooks"](https://liaison.dev/docs/v1/reference/storable-attribute#hooks) section above.
   *
   * @category Hook
   */
}
