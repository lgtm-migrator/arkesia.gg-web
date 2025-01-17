import {
  Button,
  Drawer,
  Group,
  ScrollArea,
  Space,
  Text,
  TextInput,
  Title,
  Stack,
} from "@mantine/core";
import { useDidUpdate, useLocalStorageValue } from "@mantine/hooks";
import { useNotifications } from "@mantine/notifications";
import { EyeClosedIcon, EyeOpenIcon } from "@modulz/radix-icons";
import { useEffect, useRef } from "react";
import { Form, useActionData, useTransition } from "@remix-run/react";
import {
  useDiscoveredNodes,
  useDrawerPosition,
  useEditingNodeLocation,
  useSelectedNodeLocation,
  useSetEditingNodeLocation,
  useSetSelectedNodeLocation,
  useToggleDiscoveredNode,
} from "~/lib/store";
import { AvailableNodes } from "./AvailableNodes";
import ImagePreview from "./ImagePreview";
import NodeDescription from "./NodeDescription";
import type { URLSearchParamsInit } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { ClientOnly } from "remix-utils";
import IslandGuideLink from "./IslandGuideLink";
import ShareButton from "./ShareButton";
import type { nodeAction } from "~/lib/actions.server";

export default function NodeDetails() {
  const location = useLocation();
  const selectedNodeLocation = useSelectedNodeLocation();
  const setSelectedNodeLocation = useSetSelectedNodeLocation();
  const editingNodeLocation = useEditingNodeLocation();
  const setEditingNodeLocation = useSetEditingNodeLocation();
  const transition = useTransition();
  const actionData = useActionData<typeof nodeAction>();
  const [userToken] = useLocalStorageValue<string>({
    key: "user-token",
    defaultValue: "",
  });
  const notifications = useNotifications();
  const notificationId = useRef<string | null>(null);
  const discoveredNodes = useDiscoveredNodes();
  const toggleDiscoveredNode = useToggleDiscoveredNode();
  const drawerPosition = useDrawerPosition();
  const [searchParams, setSearchParams] = useSearchParams();
  const nodeLocation = useEditingNodeLocation();

  useEffect(() => {
    if (nodeLocation) {
      return;
    }
    if (transition.state === "submitting") {
      notificationId.current = notifications.showNotification({
        loading: true,
        title: userToken ? "Submitting deletion request" : "Reporting issue",
        message: "",
        autoClose: false,
        disallowClose: true,
      });
    } else if (transition.state === "idle" && notificationId.current) {
      if (actionData) {
        notifications.updateNotification(notificationId.current, {
          id: notificationId.current,
          title: "Something is wrong",
          message: "",
          color: "red",
        });
      } else {
        notifications.updateNotification(notificationId.current, {
          id: notificationId.current,
          title: userToken ? "Node deleted 💀" : "Issue reported",
          message: "",
        });
        notificationId.current = null;
        setSelectedNodeLocation(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transition.state, actionData, transition.submission?.method]);

  useDidUpdate(() => {
    const newSearchParams: URLSearchParamsInit = {};
    const tileId = searchParams.get("tileId");
    if (tileId) {
      newSearchParams.tileId = tileId;
    }
    if (selectedNodeLocation) {
      newSearchParams.node = selectedNodeLocation.areaNodeId.toString();
      newSearchParams.location = selectedNodeLocation.id.toString();
    }
    setSearchParams(newSearchParams);
  }, [selectedNodeLocation]);

  return (
    <Drawer
      opened={Boolean(selectedNodeLocation && !editingNodeLocation)}
      zIndex={10950}
      withOverlay={false}
      padding="md"
      position={drawerPosition}
      onClose={() => setSelectedNodeLocation(null)}
      withinPortal={false}
      style={{
        position: "relative",
        zIndex: 10950,
      }}
    >
      <Stack style={{ height: "calc(100% - 50px)" }} spacing={0}>
        {selectedNodeLocation && (
          <>
            <Title order={3}>
              {selectedNodeLocation.areaNode.name ||
                selectedNodeLocation.areaNode.type}
            </Title>
            <Text color="teal">{selectedNodeLocation.areaNode.type}</Text>
            <Text size="xs">
              Node ID: {selectedNodeLocation.areaNodeId} Location ID:{" "}
              {selectedNodeLocation.id}
            </Text>
            {(selectedNodeLocation.areaNode.type === "Island" ||
              selectedNodeLocation.areaNode.type === "PvP Island") && (
              <IslandGuideLink areaNode={selectedNodeLocation.areaNode} />
            )}
            {selectedNodeLocation.areaNode.description && (
              <NodeDescription
                html={selectedNodeLocation.areaNode.description}
              />
            )}
            {selectedNodeLocation.areaNode.screenshot && (
              <ImagePreview src={selectedNodeLocation.areaNode.screenshot} />
            )}
            <Space h="md" />
            <ScrollArea style={{ flex: 1 }}>
              {selectedNodeLocation.areaNode.transitTo && (
                <>
                  <AvailableNodes
                    areaName={
                      selectedNodeLocation.areaNode.transitTo
                        .areaNodeLocations[0].areaName
                    }
                  />
                  <Space h="md" />
                </>
              )}
            </ScrollArea>
            <Button
              onClick={() =>
                toggleDiscoveredNode(selectedNodeLocation.areaNode)
              }
              color="gray"
              variant="light"
              size="xs"
              compact
              mb="xs"
              sx={{
                "> *": {
                  justifyContent: "left",
                },
              }}
            >
              <Group>
                <ClientOnly>
                  {() =>
                    discoveredNodes.some(
                      (discoveredNode) =>
                        discoveredNode.id === selectedNodeLocation.areaNodeId
                    ) ? (
                      <>
                        <EyeClosedIcon /> Discovered
                      </>
                    ) : (
                      <>
                        <EyeOpenIcon />
                        Not discovered
                      </>
                    )
                  }
                </ClientOnly>
              </Group>
            </Button>
            <ShareButton areaNodeLocation={selectedNodeLocation} />
            <Text size="xs">See all discovered nodes in the settings</Text>
            <Space h="md" />
            <ClientOnly>
              {() =>
                userToken ? (
                  <Form
                    action={`${location.pathname}${location.search}`}
                    method="delete"
                    className="node-form"
                  >
                    <input type="hidden" name="_action" value="delete" />
                    <input
                      type="hidden"
                      name="id"
                      value={selectedNodeLocation.id}
                    />
                    <input type="hidden" name="userToken" value={userToken} />
                    <Button
                      type="submit"
                      color="red"
                      loading={transition.state !== "idle"}
                    >
                      Delete
                    </Button>
                    <Button
                      type="button"
                      color="teal"
                      onClick={() => {
                        setEditingNodeLocation(selectedNodeLocation);
                        setSelectedNodeLocation(null);
                      }}
                    >
                      Edit
                    </Button>
                  </Form>
                ) : (
                  <Form
                    action={`${location.pathname}${location.search}`}
                    method="post"
                    className="node-form"
                  >
                    <input type="hidden" name="_action" value="report" />
                    <input
                      type="hidden"
                      name="id"
                      value={selectedNodeLocation.id}
                    />
                    <TextInput
                      label="Is there any issue with this node?"
                      placeholder="Give us details"
                      name="reason"
                      required
                    />
                    <Button
                      type="submit"
                      color="teal"
                      loading={transition.state !== "idle"}
                    >
                      Report issue
                    </Button>
                  </Form>
                )
              }
            </ClientOnly>
          </>
        )}
      </Stack>
    </Drawer>
  );
}
