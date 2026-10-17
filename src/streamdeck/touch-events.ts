import {EventManager} from 'streamdeck-typescript';

// streamdeck-typescript 3.3.4 forwards this documented event, but omits it from SDOnActionEvent's union.
export function SDOnTouchTap<T>(target: object, key: string | symbol, descriptor: TypedPropertyDescriptor<T>): TypedPropertyDescriptor<T> {
    return EventManager.DefaultDecoratorEventListener('touchTap', target, key, descriptor);
}
