export const enum ChoiceType {
  LEFT,
  RIGHT
}

export interface Left<A> {
  tag: ChoiceType.LEFT;
  value: A;
}

export interface Right<A> {
  tag: ChoiceType.RIGHT;
  value: A;
}

export type Choice<A, B> = Left<A> | Right<B>;

export function left<A>(a: A): Left<A> {
  return {
    tag: ChoiceType.LEFT,
    value: a
  };
}

export function right<A>(a: A): Right<A> {
  return {
    tag: ChoiceType.RIGHT,
    value: a
  };
}

export function choose<A, B, C>(f: (_: A) => C, g: (_: B) => C, choice: Choice<A, B>): C {
  switch (choice.tag) {
    case ChoiceType.LEFT:
      return f(choice.value);
    case ChoiceType.RIGHT:
      return g(choice.value);
    default:
      throw new Error('invalid third argument passed to choose')
  }
}

export const enum OptionType {
  NONE,
  SOME
};

export interface Some<A> {
  tag: OptionType.SOME;
  value: A;
}

export interface None {
  tag: OptionType.NONE;
}

export type Option<A> = Some<A> | None;

export const none: None = {
  tag: OptionType.NONE
};

export function some<A>(a: A): Option<A> {
  return {
    tag: OptionType.SOME,
    value: a
  };
}
