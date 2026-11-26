import { useDroppable } from "@dnd-kit/core";
import type { CSSProperties, ReactNode } from "react";
import { dropId, type DropTarget } from "../lib";

type Props = {
  target: DropTarget;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

export function Droppable({ target, className, style, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: dropId(target),
    data: target,
  });
  return (
    <div
      ref={setNodeRef}
      className={[className, isOver && "is-over"].filter(Boolean).join(" ")}
      style={style}
    >
      {children}
    </div>
  );
}
