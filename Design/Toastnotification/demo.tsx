import { useToasts } from "@/components/ui/toast";
import { Button } from "@/components/ui/button-1";

export default function DefaultDemo() {
  const toasts = useToasts();
  return (
        <Button
          onClick={(): void => {
            toasts.message({
              text: `The Evil Rabbit jumped over the fence.`
            });
          }}
        >
          Show Toast
        </Button>
  );
}
