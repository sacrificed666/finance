export type CustomPropertyName = `--${string}`;

declare module "react" {
  interface CSSProperties {
    [property: CustomPropertyName]: string | number | undefined;
  }
}
